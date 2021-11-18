import { Basket, ProductsOnBaskets, Product } from "@prisma/client";

export type User = {
  name: string;
  email: string;
};

export type BasketWithProducts = Basket & {
  products: (ProductsOnBaskets & {
    product: Product;
  })[];
};
