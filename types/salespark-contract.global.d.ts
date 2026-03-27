// types/salespark-contract.global.d.ts

/** Standard SalesPark return contract. @template T */
declare global {
  type SalesParkContract<T = any> = {
    /** Indicates whether the operation succeeded */
    status: boolean;

    /** Payload returned by the operation */
    data: any;
  };
}

export {};
