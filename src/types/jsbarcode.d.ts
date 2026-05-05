declare module "jsbarcode/bin/barcodes/EAN_UPC/EAN13.js" {
  type EAN13Class = new (
    data: string,
    options: { flat?: boolean }
  ) => { valid(): boolean; encode(): { data: string; text: string } };
  const EAN13: EAN13Class;
  export default EAN13;
}
