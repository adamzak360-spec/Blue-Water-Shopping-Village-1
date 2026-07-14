import { supabase } from '../supabaseClient';

export interface Supplier {
  id: string;
  company_name: string;
  contact_person: string;
  phone_number: string;
  email_address: string;
  business_address: string;
  tax_id?: string;
  notes?: string;
  status: 'Active' | 'Inactive';
  created_at: string;
  updated_at: string;
}

export interface SupplierFormData {
  company_name: string;
  contact_person: string;
  phone_number: string;
  email_address: string;
  business_address: string;
  tax_id?: string;
  notes?: string;
  status: 'Active' | 'Inactive';
}

export const supplierService = {
  async getSuppliers() {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .order('company_name', { ascending: true });
    
    if (error) throw error;
    return (data || []) as Supplier[];
  },

  async getSupplierById(id: string) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('suppliers')
      .select('*, products(*)')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  async createSupplier(supplier: SupplierFormData) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('suppliers')
      .insert([supplier])
      .select()
      .single();
    
    if (error) throw error;
    return data as Supplier;
  },

  async updateSupplier(id: string, supplier: Partial<SupplierFormData>) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('suppliers')
      .update(supplier)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data as Supplier;
  },

  async deleteSupplier(id: string) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  async linkProductToSupplier(productId: string, supplierId: string) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase
      .from('product_suppliers')
      .insert([{ product_id: productId, supplier_id: supplierId }]);
    
    if (error) throw error;
    return true;
  },

  async unlinkProductFromSupplier(productId: string, supplierId: string) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { error } = await supabase
      .from('product_suppliers')
      .delete()
      .match({ product_id: productId, supplier_id: supplierId });
    
    if (error) throw error;
    return true;
  },

  async getProductSuppliers(productId: string) {
    if (!supabase) throw new Error('Supabase client not initialized');
    const { data, error } = await supabase
      .from('product_suppliers')
      .select('supplier_id, suppliers(*)')
      .eq('product_id', productId);
    
    if (error) throw error;
    return (data || []).map((item: any) => item.suppliers) as unknown as Supplier[];
  }
};
