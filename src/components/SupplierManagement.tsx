import React, { useState, useEffect } from 'react';
import { supplierService, Supplier, SupplierFormData } from '../services/supplierService';
import { Plus, Edit2, Trash2, Building2, User, Phone, Mail, MapPin, X, Check } from 'lucide-react';

const SupplierManagement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierFormData>({
    company_name: '',
    contact_person: '',
    phone_number: '',
    email_address: '',
    business_address: '',
    tax_id: '',
    notes: '',
    status: 'Active'
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const data = await supplierService.getSuppliers();
      setSuppliers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_person: '',
      phone_number: '',
      email_address: '',
      business_address: '',
      tax_id: '',
      notes: '',
      status: 'Active'
    });
    setEditingSupplier(null);
  };

  const handleOpenModal = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        company_name: supplier.company_name,
        contact_person: supplier.contact_person,
        phone_number: supplier.phone_number,
        email_address: supplier.email_address,
        business_address: supplier.business_address,
        tax_id: supplier.tax_id || '',
        notes: supplier.notes || '',
        status: supplier.status
      });
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await supplierService.updateSupplier(editingSupplier.id, formData);
      } else {
        await supplierService.createSupplier(formData);
      }
      setIsModalOpen(false);
      resetForm();
      fetchSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to save supplier');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        await supplierService.deleteSupplier(id);
        fetchSuppliers();
      } catch (err: any) {
        alert(err.message || 'Failed to delete supplier');
      }
    }
  };

  if (loading && suppliers.length === 0) {
    return <div className="flex justify-center items-center h-64">Loading suppliers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Supplier Management</h2>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Add New Supplier
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {suppliers.map(supplier => (
          <div key={supplier.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                  <Building2 size={24} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleOpenModal(supplier)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(supplier.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1">{supplier.company_name}</h3>
              <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
                <User size={14} /> {supplier.contact_person}
              </p>

              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Phone size={14} /> {supplier.phone_number}
                </div>
                <div className="flex items-center gap-2">
                  <Mail size={14} /> {supplier.email_address}
                </div>
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0" /> 
                  <span className="line-clamp-2">{supplier.business_address}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  supplier.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {supplier.status}
                </span>
                <span className="text-xs text-gray-400">
                  Added: {new Date(supplier.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {suppliers.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
          <Building2 size={48} className="mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">No suppliers found. Click "Add New Supplier" to get started.</p>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Company Name *</label>
                  <input
                    required
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Blue Water Wholesale"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Contact Person *</label>
                  <input
                    required
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Phone Number *</label>
                  <input
                    required
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. +234 800 000 0000"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Email Address *</label>
                  <input
                    required
                    type="email"
                    name="email_address"
                    value={formData.email_address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. contact@supplier.com"
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Business Address *</label>
                  <input
                    required
                    name="business_address"
                    value={formData.business_address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Full physical address"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Tax ID / Business Reg</label>
                  <input
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Any additional information..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Check size={20} />
                  {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
