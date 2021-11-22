import { Link, LoaderFunction, json, useLoaderData } from "remix";

import { BasketLog, Basket, Order, Product } from "@prisma/client";

import { prisma } from "~/services/db.server";

type RouteData = {
  basketLogs: (BasketLog & {
    basket: Basket & {
      order: Order;
    };

    product: Product;
  })[];
};

export const loader: LoaderFunction = async () => {
  const basketLogs = await prisma.basketLog.findMany({
    where: {
      AND: {
        type: "PRODUCT_REMOVED",

        basket: {
          status: "COMPLETED",
          order: {},
        },
      },
    },

    include: {
      basket: {
        include: {
          order: true,
        },
      },

      product: true,
    },
  });

  return json({
    basketLogs,
  });
};

export default function DashboardRoute() {
  const { basketLogs } = useLoaderData<RouteData>();

  return (
    <>
      <header className="flex flex-col items-center justify-between space-y-4 md:flex-row md:space-y-0">
        <h1 className="text-center md:text-left">Hey there, Sales Manager!</h1>

        <Link to="/" className="btn">
          Go back!
        </Link>
      </header>

      <div className="divider" />

      <div>
        <h2>
          Here's a list of products that were removed from the user basket
          before checkout
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Product</th>
                <th>User</th>
                <th>Removed from basket at</th>
                <th>Checked out at</th>
              </tr>
            </thead>

            <tbody>
              {basketLogs.map((basketLog) => (
                <tr>
                  <td>{basketLog.product.name}</td>
                  <td>{basketLog.user}</td>
                  <td>{new Date(basketLog.createdAt).toDateString()}</td>

                  <td>
                    {new Date(basketLog.basket.order.createdAt).toDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
