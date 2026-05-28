import { run, get } from './database';
import { XMLParser } from 'fast-xml-parser';
import { randomUUID } from 'node:crypto';

interface ProductImport {
  barcode: string;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  store_id: string;
}

export class GuardianProtocol {
  static parseXML(xmlData: string, storeId: string): ProductImport[] {
    const parser = new XMLParser();
    const jsonObj = parser.parse(xmlData);
    
    // Supondo estrutura <products><item><barcode>...</barcode></item></products>
    const items = Array.isArray(jsonObj.products?.item) 
      ? jsonObj.products.item 
      : [jsonObj.products?.item].filter(Boolean);

    return items.map((item: any) => ({
      barcode: String(item.barcode),
      name: String(item.name),
      price: Number(item.price),
      quantity: Number(item.quantity || 0),
      image: item.image ? String(item.image) : '',
      store_id: storeId
    }));
  }

  static validate(products: ProductImport[]): ProductImport[] {
    return products.filter(p => p.barcode && p.name && p.price > 0 && p.store_id);
  }

  static async bulkInsert(products: ProductImport[]) {
    let newProductsCount = 0;
    let stockUpdatedCount = 0;

    for (const p of products) {
      let existingProduct = await get('SELECT id FROM products WHERE barcode = ?', [p.barcode]);
      let productId = existingProduct?.id;

      if (!productId) {
        productId = randomUUID();
        await run(`INSERT INTO products (id, barcode, name, price, image, extra_barcodes) VALUES (?, ?, ?, ?, ?, '[]')`, 
          [productId, p.barcode, p.name, p.price, p.image || '']);
        newProductsCount++;
      } else {
        await run(`UPDATE products SET name = ?, price = ? WHERE id = ?`, [p.name, p.price, productId]);
      }

      const existingStock = await get('SELECT quantity FROM inventory WHERE product_id = ? AND store_id = ?', 
        [productId, p.store_id]);

      if (existingStock) {
        await run(`UPDATE inventory SET quantity = quantity + ? WHERE product_id = ? AND store_id = ?`, 
          [p.quantity, productId, p.store_id]);
      } else {
        await run(`INSERT INTO inventory (product_id, store_id, quantity) VALUES (?, ?, ?)`, 
          [productId, p.store_id, p.quantity]);
      }
      stockUpdatedCount++;
    }

    return { newProducts: newProductsCount, stockUpdates: stockUpdatedCount };
  }
}