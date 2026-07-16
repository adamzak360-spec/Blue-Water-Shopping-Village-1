import React, { useState, useEffect, useMemo } from 'react';
import { supplierService, Supplier, SupplierFormData } from '../services/supplierService';
import { Plus, Edit2, Trash2, Building2, User, Phone, Mail, MapPin, X, Check, Search, Filter, Download, AlertTriangle } from 'lucide-react';
import './InventoryManagement.css'; // Reusing inventory styles for consistency

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
      <div className="inventory-loading">
        <div className="inventory-spinner" />
        <p>Syncing supplier data...</p>
      </div>
    );
  }

  return (
    <div className="inventory-management-container">
      {error && (
        <div className="inventory-error-banner">
          <AlertTriangle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Header Section */}
      <div className="inventory-header-section">
        <div>
          <h2 className="inventory-title">Supplier Management</h2>
          <p className="inventory-subtitle">Manage your product vendors and contact information</p>
        </div>
        <div className="flex gap-3">
          <button className="inventory-export-btn" onClick={handleExportCSV}>
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          <button 
            className="inventory-btn-primary flex items-center gap-2 px-6" 
            onClick={() => handleOpenModal()}
          >
            <Plus size={18} />
            <span>Add New Supplier</span>
          </button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="inventory-summary-grid">
        <div className="inventory-summary-card total">
          <div className="summary-icon-wrapper">
            <Building2 size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Total Suppliers</span>
            <span className="summary-value">{stats.total}</span>
          </div>
        </div>
        <div className="inventory-summary-card products">
          <div className="summary-icon-wrapper">
            <Check size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Active</span>
            <span className="summary-value">{stats.active}</span>
          </div>
        </div>
        <div className="inventory-summary-card danger">
          <div className="summary-icon-wrapper">
            <X size={24} />
          </div>
          <div className="summary-info">
            <span className="summary-label">Inactive</span>
            <span className="summary-value">{stats.inactive}</span>
          </div>
        </div>
      </div>

      {/* Filters & Content Area */}
      <div className="inventory-content-wrapper">
        <div className="inventory-list-view">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="inventory-search-bar flex-1">
              <Search size={18} />
              <input 
                type="text"
                placeholder="Search by company, contact or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="min-w-[200px]">
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="inventory-select w-full"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active Only</option>
                <option value="Inactive">Inactive Only</option>
              </select>
            </div>
          </div>

          <div className="inventory-table-container">
            <table className="inventory-data-table">
              <thead>
                <tr>
                  <th>Company Details</th>
                  <th>Contact Person</th>
                  <th>Contact Info</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id}>
                    <td>
                      <div className="product-info-cell">
                        <span className="p-name">{supplier.company_name}</span>
                        <span className="p-id flex items-center gap-1">
                          <MapPin size={12} /> {supplier.business_address}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-gray-400" />
                        <span className="font-medium text-gray-700">{supplier.contact_person}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col gap-1 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Phone size={14} className="text-blue-500" />
                          <span>{supplier.phone_number}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail size={14} className="text-blue-500" />
                          <span className="truncate max-w-[180px]">{supplier.email_address}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${supplier.status.toLowerCase()}`}>
                        {supplier.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleOpenModal(supplier)}
                          className="inventory-action-btn"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(supplier.id)}
                          className="inventory-action-btn hover:!bg-red-50 hover:!text-red-600 hover:!border-red-200"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredSuppliers.length === 0 && (
              <div className="inventory-empty-state py-12">
                <Building2 size={48} className="text-gray-300 mb-4" />
                <h4 className="text-lg font-bold text-gray-900">No suppliers found</h4>
                <p className="text-gray-500">Try adjusting your search or filters.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Professional Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex justify-center items-center z-[1000] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
                </h3>
                <p className="text-gray-500 text-sm mt-0.5">Enter vendor information</p>
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
                <div className="form-input-group">
                  <label>Company Name *</label>
                  <input
                    required
                    name="company_name"
                    value={formData.company_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Blue Water Wholesale"
                  />
                </div>
                <div className="form-input-group">
                  <label>Contact Person *</label>
                  <input
                    required
                    name="contact_person"
                    value={formData.contact_person}
                    onChange={handleInputChange}
                    placeholder="e.g. John Doe"
                  />
                </div>
                <div className="form-input-group">
                  <label>Phone Number *</label>
                  <input
                    required
                    name="phone_number"
                    value={formData.phone_number}
                    onChange={handleInputChange}
                    placeholder="e.g. +234 800 000 0000"
                  />
                </div>
                <div className="form-input-group">
                  <label>Email Address *</label>
                  <input
                    required
                    type="email"
                    name="email_address"
                    value={formData.email_address}
                    onChange={handleInputChange}
                    placeholder="e.g. contact@supplier.com"
                  />
                </div>
                <div className="form-input-group md:col-span-2">
                  <label>Business Address *</label>
                  <input
                    required
                    name="business_address"
                    value={formData.business_address}
                    onChange={handleInputChange}
                    placeholder="Full physical address"
                  />
                </div>
                <div className="form-input-group">
                  <label>Tax ID / Business Reg</label>
                  <input
                    name="tax_id"
                    value={formData.tax_id}
                    onChange={handleInputChange}
                    placeholder="Optional"
                  />
                </div>
                <div className="form-input-group">
                  <label>Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="inventory-select w-full"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-input-group md:col-span-2">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:border-blue-500 resize-none"
                    placeholder="Any additional information..."
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="inventory-btn-secondary px-8"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="inventory-btn-primary px-8 flex items-center gap-2"
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
