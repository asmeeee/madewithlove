import {
  useLoaderData,
  Form,
  Link,
  MetaFunction,
  LoaderFunction,
  ActionFunction,
  json,
  redirect,
  useTransition,
} from "remix";

import { prisma } from "~/services/db.server";

import { setUser, getUser } from "~/services/user";

import { User, BasketWithProducts } from "~/types";

type RouteData = {
  user: User;
  basket: BasketWithProducts;
};

export const meta: MetaFunction = () => {
  return {
    title: "Our checkout page",
    description: "We'll deliver your order as lightning goes",
  };
};

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);

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
        "Set-Cookie": await setUser(user),
      },
    }
  );
};

export const action: ActionFunction = async ({ request }) => {
  const user = await getUser(request);

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

  if (basket) {
    const body = new URLSearchParams(await request.text());

    const basketSum =
      basket?.products?.reduce(
        (sum, productOnBasket) => sum + Number(productOnBasket.product.price),
        0
      ) || 0;

    await prisma.order.create({
      data: {
        user: `${user.name} - ${user.email}`,
        address: body.get("address") as string,
        sum: basketSum,

        products: {
          createMany: {
            data: basket.products.map((productOnBasket) => {
              return {
                productId: productOnBasket.productId,
              };
            }),
          },
        },
      },
    });

    await prisma.productsOnBaskets.deleteMany({
      where: {
        basketId: basket.id,
      },
    });

    await prisma.basket.deleteMany({
      where: {
        user: `${user.name} - ${user.email}`,
      },
    });
  }

  return redirect("/");
};

export default function CheckoutRoute() {
  const transition = useTransition();

  const { user, basket } = useLoaderData<RouteData>();

  const basketSum =
    basket?.products?.reduce(
      (sum, productOnBasket) => sum + Number(productOnBasket.product.price),
      0
    ) || 0;

  const isPending = !!transition.submission;

  return (
    <>
      <header className="flex items-center justify-between">
        <h1>
          Hey there, {user.name} - {user.email}!
        </h1>

        <Link to="/" className="btn">
          Go back!
        </Link>
      </header>

      <div className="divider" />

      <div>
        <h2>You are about to order for a whole lot of ${basketSum}.</h2>

        <div className="mt-4 overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
              </tr>
            </thead>

            <tbody>
              {basket?.products?.map((productOnBasket) => (
                <tr>
                  <td>{productOnBasket.product.name}</td>
                  <td>${productOnBasket.product.price}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="divider" />

      <Form method="post">
        <fieldset className="p-4 border border-black" disabled={isPending}>
          <legend className="px-1 font-medium">Delivery information</legend>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Address</span>
            </label>

            <input
              type="text"
              name="address"
              placeholder="Netherlands, Near the sea"
              className="input input-bordered"
              required
            />
          </div>
        </fieldset>

        <div className="text-center">
          <button className="btn btn-primary mt-4">Order</button>
        </div>
      </Form>
    </>
  );
}
