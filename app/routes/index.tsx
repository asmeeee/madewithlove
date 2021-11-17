import {
  MetaFunction,
  ActionFunction,
  LoaderFunction,
  createCookie,
  useLoaderData,
  json,
  redirect,
  Form,
} from "remix";

import faker from "faker";

import { Basket, Product, ProductsOnBaskets } from "@prisma/client";

import { prisma } from "~/services/db.server";

type RouteData = {
  profile: {
    name: string;
    email: string;
  };

  basket: Basket & {
    products: (ProductsOnBaskets & {
      product: Product;
    })[];
  };

  products: Product[];
};

const profileCookie = createCookie("profile", {
  httpOnly: true,
  maxAge: 604_800,
});

export const meta: MetaFunction = () => {
  return {
    title: "Remix Starter",
    description: "Welcome to remix!",
  };
};

export const loader: LoaderFunction = async ({ request }) => {
  const currentProfile =
    (await profileCookie.parse(request.headers.get("Cookie"))) || {};

  const newProfile =
    "name" in currentProfile
      ? { name: currentProfile.name, email: currentProfile.email }
      : { name: faker.name.findName(), email: faker.internet.email() };

  const basket = await prisma.basket.findFirst({
    where: {
      user: `${newProfile.name} - ${newProfile.email}`,
    },

    include: {
      products: {
        include: {
          product: true,
        },
      },
    },
  });

  const products = await prisma.product.findMany();

  return json(
    {
      profile: newProfile,

      basket,
      products,
    },
    {
      headers: {
        "Set-Cookie": await profileCookie.serialize(newProfile),
      },
    }
  );
};

export const action: ActionFunction = async ({ request }) => {
  const currentProfile =
    (await profileCookie.parse(request.headers.get("Cookie"))) || {};

  const body = new URLSearchParams(await request.text());

  const productId = Number(body.get("productId"));

  const existingBasket = await prisma.basket.findFirst({
    where: {
      user: `${currentProfile.name} - ${currentProfile.email}`,
    },

    include: {
      products: true,
    },
  });

  switch (request.method.toLowerCase()) {
    case "delete":
      if (existingBasket) {
        await prisma.productsOnBaskets.delete({
          where: {
            productId_basketId: {
              basketId: existingBasket.id,
              productId: productId,
            },
          },
        });

        await prisma.productLog.create({
          data: {
            user: `${currentProfile.name} - ${currentProfile.email}`,
            type: "REMOVED_FROM_BASKET",
            productId: productId,
          },
        });
      }

      break;

    case "post":
      if (existingBasket) {
        const alreadyInBasket = existingBasket.products.find(
          (productOnBasket) => productOnBasket.productId === productId
        );

        if (!alreadyInBasket) {
          await prisma.productsOnBaskets.create({
            data: {
              basketId: existingBasket.id,
              productId: productId,
            },
          });
        }
      } else {
        await prisma.basket.create({
          data: {
            user: `${currentProfile.name} - ${currentProfile.email}`,

            products: {
              create: [
                {
                  product: {
                    connect: {
                      id: productId,
                    },
                  },
                },
              ],
            },
          },
        });
      }

      await prisma.productLog.create({
        data: {
          user: `${currentProfile.name} - ${currentProfile.email}`,
          type: "ADDED_TO_BASKET",
          productId: productId,
        },
      });

      break;
  }

  return redirect("/");
};

export default function Index() {
  const { profile, basket, products } = useLoaderData<RouteData>();

  const basketSum =
    basket?.products?.reduce(
      (sum, productOnBasket) => sum + Number(productOnBasket.product.price),
      0
    ) || 0;

  return (
    <div>
      <header className="flex items-center justify-between">
        <h1>
          Hey there, {profile.name} - {profile.email}!
        </h1>

        <div className="dropdown dropdown-end">
          <div tabIndex={0} className="btn m-1">
            Your basket ({basket?.products?.length || 0} - ${basketSum})
          </div>

          <ul
            tabIndex={0}
            className="menu dropdown-content rounded-box p-2 w-52 bg-base-100 shadow"
          >
            <li>
              <a>Item 1</a>
            </li>
            <li>
              <a>Item 2</a>
            </li>
            <li>
              <a>Item 3</a>
            </li>
          </ul>
        </div>
      </header>

      <div className="divider" />

      <div className="grid gap-10 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        {products.map((product) => (
          <div className="card lg:card-side text-primary-content bg-primary shadow-2xl">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <p>{product.name}</p>
                <span>${product.price}</span>
              </div>

              <div className="card-actions justify-center">
                {basket?.products.find(
                  (productOnBasket) => productOnBasket.productId === product.id
                ) ? (
                  <Form method="delete">
                    <input type="hidden" name="productId" value={product.id} />

                    <button className="btn btn-primary">
                      Remove from basket
                    </button>
                  </Form>
                ) : (
                  <Form method="post">
                    <input type="hidden" name="productId" value={product.id} />

                    <button className="btn btn-primary">Add to basket</button>
                  </Form>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
