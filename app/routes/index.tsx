import {
  MetaFunction,
  ActionFunction,
  LoaderFunction,
  useLoaderData,
  json,
  redirect,
  Form,
  Link,
} from "remix";

import faker from "faker";

import { Product } from "@prisma/client";

import { prisma } from "~/services/db.server";

import { userCookie } from "~/services/user";

import { User, BasketWithProducts } from "~/types";

type RouteData = {
  user: User;
  basket: BasketWithProducts;
  products: Product[];
};

export const meta: MetaFunction = () => {
  return {
    title: "Our home page",
    description: "Order something nice",
  };
};

export const loader: LoaderFunction = async ({ request }) => {
  const existingUser =
    (await userCookie.parse(request.headers.get("Cookie"))) || {};

  const user =
    "name" in existingUser
      ? { name: existingUser.name, email: existingUser.email }
      : { name: faker.name.findName(), email: faker.internet.email() };

  const basket = await prisma.basket.findFirst({
    where: {
      user: `${user.name} - ${user.email}`,
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
      user,
      basket,
      products,
    },
    {
      headers: {
        "Set-Cookie": await userCookie.serialize(user),
      },
    }
  );
};

export const action: ActionFunction = async ({ request }) => {
  const user = (await userCookie.parse(request.headers.get("Cookie"))) || {};

  const body = new URLSearchParams(await request.text());

  const productId = Number(body.get("productId"));

  const existingBasket = await prisma.basket.findFirst({
    where: {
      user: `${user.name} - ${user.email}`,
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
            user: `${user.name} - ${user.email}`,
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
            user: `${user.name} - ${user.email}`,

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
          user: `${user.name} - ${user.email}`,
          type: "ADDED_TO_BASKET",
          productId: productId,
        },
      });

      break;
  }

  return redirect("/");
};

export default function IndexRoute() {
  const { user, basket, products } = useLoaderData<RouteData>();

  const basketSum =
    basket?.products?.reduce(
      (sum, productOnBasket) => sum + Number(productOnBasket.product.price),
      0
    ) || 0;

  return (
    <div>
      <header className="flex items-center justify-between">
        <h1>
          Hey there, {user.name} - {user.email}!
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
              <Link to="/checkout">Checkout</Link>
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
