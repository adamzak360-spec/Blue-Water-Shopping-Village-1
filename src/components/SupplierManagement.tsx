import React, { useState, useEffect, useMemo } from 'react';
import { supplierService, Supplier, SupplierFormData } from '../services/supplierService';
import {   Plus, Edit2, Trash2, Building2, User, Phone, Mail, MapPin, X, Check, Search, Filter, Download } from 'lucide-react';

const SupplierManagement: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');
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

  const filteredSuppliers = useMemo(() => {
    return suppliers.filter(s => {
      const matchesSearch = 
        s.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email_address.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'All' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [suppliers, searchTerm, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: suppliers.length,
      active: suppliers.filter(s => s.status === 'Active').length,
      inactive: suppliers.filter(s => s.status === 'Inactive').length
    };
  }, [suppliers]);

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

  const handleExportCSV = async () => {
    try {
      const csv = await supplierService.exportSuppliersCSV();
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `suppliers-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export suppliers');
    }
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
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading suppliers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Supplier Management</h2>
          <p className="text-gray-500 text-sm mt-1">Manage your product vendors and contact information</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
          >
            <Download size={20} />
            <span className="font-semibold">Export CSV</span>
          </button>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm hover:shadow-md"
          >
            <Plus size={20} />
            <span className="font-semibold">Add New Supplier</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-sm">
          <p className="text-blue-100 text-sm font-semibold uppercase tracking-wider">Total Suppliers</p>
          <p className="text-3xl font-bold mt-2">{stats.total}</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-2xl text-white shadow-sm">
          <p className="text-emerald-100 text-sm font-semibold uppercase tracking-wider">Active</p>
          <p className="text-3xl font-bold mt-2">{stats.active}</p>
        </div>
        <div className="bg-gradient-to-br from-gray-500 to-gray-600 p-6 rounded-2xl text-white shadow-sm">
          <p className="text-gray-100 text-sm font-semibold uppercase tracking-wider">Inactive</p>
          <p className="text-3xl font-bold mt-2">{stats.inactive}</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            placeholder="Search by company, contact or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 min-w-[200px]">
          <Filter size={18} className="text-gray-400" />
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center gap-3">
          <X className="bg-red-100 p-1 rounded-full" size={20} />
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* Supplier Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSuppliers.map(supplier => (
          <div key={supplier.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group">
            <div className="p-6">
              <div className="flex justify-between items-start mb-5">
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                  <Building2 size={24} />
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => handleOpenModal(supplier)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Edit Supplier"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => handleDelete(supplier.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Delete Supplier"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">{supplier.company_name}</h3>
              <p className="text-sm text-gray-500 mb-5 flex items-center gap-2">
                <User size={14} className="text-gray-400" /> 
                <span className="font-medium">{supplier.contact_person}</span>
              </p>

              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg">
                  <Phone size={16} className="text-blue-500" /> 
                  <span className="font-medium">{supplier.phone_number}</span>
                </div>
                <div className="flex items-center gap-3 bg-gray-50 p-2.5 rounded-lg">
                  <Mail size={16} className="text-blue-500" /> 
                  <span className="font-medium truncate">{supplier.email_address}</span>
                </div>
                <div className="flex items-start gap-3 bg-gray-50 p-2.5 rounded-lg">
                  <MapPin size={16} className="text-blue-500 mt-0.5 shrink-0" /> 
                  <span className="line-clamp-2 leading-relaxed">{supplier.business_address}</span>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-gray-100 flex justify-between items-center">
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  supplier.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {supplier.status}
                </span>
                <span className="text-xs text-gray-400 font-medium">
                  Added {new Date(supplier.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredSuppliers.length === 0 && !loading && (
        <div className="text-center py-20 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm mb-4">
            <Building2 size={40} className="text-gray-300" />
          </div>
          <h4 className="text-lg font-bold text-gray-900">No suppliers found</h4>
          <p className="text-gray-500 mt-1 max-w-xs mx-auto">Try adjusting your search or filters to find what you're looking for.</p>
          <button 
            onClick={() => {setSearchTerm(''); setStatusFilter('All');}}
            className="mt-6 text-blue-600 font-semibold hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <p className="text-gray-500 text-sm mt-0.5">Fill in the details below</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-white rounded-full text-gray-400 hover:text-gray-600 transition-all shadow-sm"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Company Name *</label>
                  <input
                    required
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. Blue Water Wholesale"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Contact Person *</label>
                  <input
                    required
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Phone Number *</label>
                  <input
                    required
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. +234 800 000 0000"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Email Address *</label>
                  <input
                    required
                    type="email"
                    name="email_address"
                    value={formData.email_address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="e.g. contact@supplier.com"
                  />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Business Address *</label>
                  <input
                    required
                    name="business_address"
                    value={formData.business_address}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Full physical address"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Tax ID / Business Reg</label>
                  <input
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-gray-700">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none transition-all"
                    placeholder="Any additional information..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-8 py-2.5 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-8 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-200"
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
