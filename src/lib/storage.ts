import { Product, Sale, SaleItem, StockMovement } from '../types';
import { getSupabaseClient } from './supabase';

const LOCAL_STORAGE_PRODUCTS = 'controle_estoque_products_v1';
const LOCAL_STORAGE_SALES = 'controle_estoque_sales_v1';
const LOCAL_STORAGE_MOVEMENTS = 'controle_estoque_movements_v1';

// Helper for Local Storage fallback
function getLocalItems<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error(`Error loading local key ${key}:`, e);
    return [];
  }
}

function setLocalItems<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items));
  } catch (e) {
    console.error(`Error saving local key ${key}:`, e);
  }
}

// Generate UUID for local fallback
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'idx_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// ================= PRODUCT OPERATIONS =================
export async function fetchProducts(): Promise<Product[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name', { ascending: true });

      if (!error && data) {
        return data as Product[];
      }
      console.warn('Supabase fetch products error, using local fallback:', error);
    } catch (e) {
      console.warn('Supabase connection issue:', e);
    }
  }
  return getLocalItems<Product>(LOCAL_STORAGE_PRODUCTS);
}

export async function createProduct(productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{
          ...productData,
          created_at: now,
          updated_at: now,
        }])
        .select()
        .single();

      if (!error && data) {
        // Record initial stock movement if > 0
        if (productData.stock_quantity > 0) {
          await createStockMovement({
            product_id: data.id,
            product_name: data.name,
            type: 'IN',
            quantity: Number(productData.stock_quantity),
            previous_stock: 0,
            new_stock: Number(productData.stock_quantity),
            reason: 'Estoque inicial de cadastro de produto',
          });
        }
        return data as Product;
      }
      console.warn('Supabase insert product failed:', error);
    } catch (e) {
      console.warn('Supabase product insert exception:', e);
    }
  }

  // Local fallback
  const newProduct: Product = {
    ...productData,
    id: generateUUID(),
    created_at: now,
    updated_at: now,
  };

  const currentProducts = getLocalItems<Product>(LOCAL_STORAGE_PRODUCTS);
  const updated = [newProduct, ...currentProducts];
  setLocalItems(LOCAL_STORAGE_PRODUCTS, updated);

  if (newProduct.stock_quantity > 0) {
    await createStockMovement({
      product_id: newProduct.id,
      product_name: newProduct.name,
      type: 'IN',
      quantity: Number(newProduct.stock_quantity),
      previous_stock: 0,
      new_stock: Number(newProduct.stock_quantity),
      reason: 'Estoque inicial de cadastro de produto',
    });
  }

  return newProduct;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: now })
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return data as Product;
      }
    } catch (e) {
      console.warn('Supabase update product error:', e);
    }
  }

  // Local fallback
  const products = getLocalItems<Product>(LOCAL_STORAGE_PRODUCTS);
  const index = products.findIndex((p) => p.id === id);
  if (index !== -1) {
    const updated = {
      ...products[index],
      ...updates,
      updated_at: now,
    };
    products[index] = updated;
    setLocalItems(LOCAL_STORAGE_PRODUCTS, products);
    return updated;
  }
  return null;
}

export async function deleteProduct(id: string): Promise<boolean> {
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) return true;
    } catch (e) {
      console.warn('Supabase delete product error:', e);
    }
  }

  const products = getLocalItems<Product>(LOCAL_STORAGE_PRODUCTS);
  const filtered = products.filter((p) => p.id !== id);
  setLocalItems(LOCAL_STORAGE_PRODUCTS, filtered);
  return true;
}

export async function adjustProductStock(
  productId: string,
  quantityChange: number, // positive for entry (IN), negative for exit (OUT)
  reason: string
): Promise<Product | null> {
  const products = await fetchProducts();
  const target = products.find((p) => p.id === productId);
  if (!target) return null;

  const previousStock = Number(target.stock_quantity);
  const newStock = Math.max(0, previousStock + quantityChange);
  const movementType = quantityChange >= 0 ? 'IN' : 'OUT';

  const updatedProduct = await updateProduct(productId, {
    stock_quantity: newStock,
  });

  if (updatedProduct) {
    await createStockMovement({
      product_id: productId,
      product_name: target.name,
      type: movementType,
      quantity: Math.abs(quantityChange),
      previous_stock: previousStock,
      new_stock: newStock,
      reason: reason || (quantityChange >= 0 ? 'Ajuste manual de entrada' : 'Ajuste manual de saída'),
    });
  }

  return updatedProduct;
}

// ================= STOCK MOVEMENTS =================
export async function fetchStockMovements(): Promise<StockMovement[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as StockMovement[];
      }
    } catch (e) {
      console.warn('Supabase fetch movements error:', e);
    }
  }

  return getLocalItems<StockMovement>(LOCAL_STORAGE_MOVEMENTS);
}

export async function createStockMovement(
  movementData: Omit<StockMovement, 'id' | 'created_at'>
): Promise<StockMovement> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('stock_movements')
        .insert([{ ...movementData, created_at: now }])
        .select()
        .single();

      if (!error && data) {
        return data as StockMovement;
      }
    } catch (e) {
      console.warn('Supabase stock movement insert error:', e);
    }
  }

  const newMovement: StockMovement = {
    ...movementData,
    id: generateUUID(),
    created_at: now,
  };

  const current = getLocalItems<StockMovement>(LOCAL_STORAGE_MOVEMENTS);
  setLocalItems(LOCAL_STORAGE_MOVEMENTS, [newMovement, ...current]);
  return newMovement;
}

// ================= SALES OPERATIONS =================
export async function fetchSales(): Promise<Sale[]> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (*)
        `)
        .order('sale_date', { ascending: false });

      if (!error && data) {
        return data.map((s: any) => ({
          ...s,
          items: s.sale_items || [],
        })) as Sale[];
      }
    } catch (e) {
      console.warn('Supabase fetch sales error:', e);
    }
  }

  return getLocalItems<Sale>(LOCAL_STORAGE_SALES);
}

export async function createSale(saleData: {
  customer_name?: string;
  customer_phone?: string;
  payment_method: Sale['payment_method'];
  discount_amount: number;
  notes?: string;
  items: Array<{
    product_id: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    cost_price: number;
  }>;
}): Promise<Sale> {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  // Compute subtotals, costs, totals, profits
  const formattedItems: SaleItem[] = saleData.items.map((it) => ({
    product_id: it.product_id,
    product_name: it.product_name,
    quantity: Number(it.quantity),
    unit_price: Number(it.unit_price),
    cost_price: Number(it.cost_price),
    subtotal: Number(it.quantity) * Number(it.unit_price),
  }));

  const subtotal = formattedItems.reduce((acc, item) => acc + item.subtotal, 0);
  const discount = Number(saleData.discount_amount || 0);
  const total_amount = Math.max(0, subtotal - discount);
  const total_cost = formattedItems.reduce(
    (acc, item) => acc + item.quantity * item.cost_price,
    0
  );
  const profit = total_amount - total_cost;

  let createdSale: Sale | null = null;

  if (supabase) {
    try {
      // 1. Insert Sale record
      const { data: saleRecord, error: saleErr } = await supabase
        .from('sales')
        .insert([
          {
            sale_date: now,
            customer_name: saleData.customer_name || null,
            customer_phone: saleData.customer_phone || null,
            payment_method: saleData.payment_method,
            subtotal,
            discount_amount: discount,
            total_amount,
            total_cost,
            profit,
            status: 'COMPLETED',
            notes: saleData.notes || null,
            created_at: now,
          },
        ])
        .select()
        .single();

      if (!saleErr && saleRecord) {
        // 2. Insert Sale Items
        const itemsToInsert = formattedItems.map((item) => ({
          sale_id: saleRecord.id,
          product_id: item.product_id,
          product_name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          cost_price: item.cost_price,
          subtotal: item.subtotal,
          created_at: now,
        }));

        const { data: insertedItems } = await supabase
          .from('sale_items')
          .insert(itemsToInsert)
          .select();

        createdSale = {
          ...saleRecord,
          items: insertedItems || formattedItems,
        };
      }
    } catch (e) {
      console.warn('Supabase sale insert failed:', e);
    }
  }

  if (!createdSale) {
    // Local fallback
    const saleId = generateUUID();
    createdSale = {
      id: saleId,
      sale_date: now,
      customer_name: saleData.customer_name,
      customer_phone: saleData.customer_phone,
      payment_method: saleData.payment_method,
      subtotal,
      discount_amount: discount,
      total_amount,
      total_cost,
      profit,
      status: 'COMPLETED',
      notes: saleData.notes,
      items: formattedItems.map((it) => ({ ...it, id: generateUUID(), sale_id: saleId })),
      created_at: now,
    };

    const currentSales = getLocalItems<Sale>(LOCAL_STORAGE_SALES);
    setLocalItems(LOCAL_STORAGE_SALES, [createdSale, ...currentSales]);
  }

  // Deduct products stock & register movements for each item
  const allProducts = await fetchProducts();

  for (const item of saleData.items) {
    const p = allProducts.find((prod) => prod.id === item.product_id);
    if (p) {
      const currentStock = Number(p.stock_quantity);
      const newStock = Math.max(0, currentStock - Number(item.quantity));

      await updateProduct(p.id, { stock_quantity: newStock });

      await createStockMovement({
        product_id: p.id,
        product_name: p.name,
        type: 'SALE',
        quantity: Number(item.quantity),
        previous_stock: currentStock,
        new_stock: newStock,
        reason: `Venda #${createdSale.id.substring(0, 8)}`,
      });
    }
  }

  return createdSale;
}

export async function cancelSale(saleId: string): Promise<boolean> {
  const sales = await fetchSales();
  const targetSale = sales.find((s) => s.id === saleId);
  if (!targetSale || targetSale.status === 'CANCELED') return false;

  const now = new Date().toISOString();
  const supabase = getSupabaseClient();

  if (supabase) {
    try {
      await supabase
        .from('sales')
        .update({ status: 'CANCELED' })
        .eq('id', saleId);
    } catch (e) {
      console.warn('Supabase cancel sale error:', e);
    }
  }

  // Update local
  const currentSales = getLocalItems<Sale>(LOCAL_STORAGE_SALES);
  const idx = currentSales.findIndex((s) => s.id === saleId);
  if (idx !== -1) {
    currentSales[idx].status = 'CANCELED';
    setLocalItems(LOCAL_STORAGE_SALES, currentSales);
  }

  // Restore inventory stock
  const allProducts = await fetchProducts();
  for (const item of targetSale.items) {
    const p = allProducts.find((prod) => prod.id === item.product_id);
    if (p) {
      const currentStock = Number(p.stock_quantity);
      const newStock = currentStock + Number(item.quantity);

      await updateProduct(p.id, { stock_quantity: newStock });

      await createStockMovement({
        product_id: p.id,
        product_name: p.name,
        type: 'CANCEL',
        quantity: Number(item.quantity),
        previous_stock: currentStock,
        new_stock: newStock,
        reason: `Cancelamento da Venda #${targetSale.id.substring(0, 8)}`,
      });
    }
  }

  return true;
}

// Helper to push local data to Supabase if connected
export async function syncLocalDataToSupabase(): Promise<{
  success: boolean;
  productsSynced: number;
  salesSynced: number;
  message: string;
}> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, productsSynced: 0, salesSynced: 0, message: 'Supabase não está configurado.' };
  }

  try {
    const localProducts = getLocalItems<Product>(LOCAL_STORAGE_PRODUCTS);
    const localSales = getLocalItems<Sale>(LOCAL_STORAGE_SALES);

    let productsCount = 0;
    let salesCount = 0;

    // Push local products
    if (localProducts.length > 0) {
      for (const prod of localProducts) {
        const { error } = await supabase.from('products').upsert({
          id: prod.id,
          sku: prod.sku,
          name: prod.name,
          category: prod.category,
          cost_price: prod.cost_price,
          sale_price: prod.sale_price,
          stock_quantity: prod.stock_quantity,
          min_stock_level: prod.min_stock_level,
          unit: prod.unit,
          description: prod.description,
          created_at: prod.created_at,
          updated_at: prod.updated_at,
        });
        if (!error) productsCount++;
      }
    }

    // Push local sales
    if (localSales.length > 0) {
      for (const sale of localSales) {
        const { error: saleErr } = await supabase.from('sales').upsert({
          id: sale.id,
          sale_date: sale.sale_date,
          customer_name: sale.customer_name,
          customer_phone: sale.customer_phone,
          payment_method: sale.payment_method,
          subtotal: sale.subtotal,
          discount_amount: sale.discount_amount,
          total_amount: sale.total_amount,
          total_cost: sale.total_cost,
          profit: sale.profit,
          status: sale.status,
          notes: sale.notes,
          created_at: sale.created_at,
        });

        if (!saleErr) {
          salesCount++;
          if (sale.items && sale.items.length > 0) {
            for (const item of sale.items) {
              await supabase.from('sale_items').upsert({
                sale_id: sale.id,
                product_id: item.product_id,
                product_name: item.product_name,
                quantity: item.quantity,
                unit_price: item.unit_price,
                cost_price: item.cost_price,
                subtotal: item.subtotal,
              });
            }
          }
        }
      }
    }

    return {
      success: true,
      productsSynced: productsCount,
      salesSynced: salesCount,
      message: `Sincronização concluída! ${productsCount} produtos e ${salesCount} vendas enviados para o Supabase.`,
    };
  } catch (err: any) {
    return {
      success: false,
      productsSynced: 0,
      salesSynced: 0,
      message: `Erro ao sincronizar com Supabase: ${err.message}`,
    };
  }
}
