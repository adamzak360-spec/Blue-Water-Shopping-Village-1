import React, { useState, useEffect, useMemo } from 'react';
import { supplierService, Supplier, SupplierFormData } from '../services/supplierService';
import { Plus, Edit2, Trash2, Building2, User, Phone, Mail, MapPin, X, Check, Download, AlertTriangle } from 'lucide-react';
import '../pages/Admin.css';

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
      <div className="loading">
        <div className="spinner-small" style={{ borderColor: '#2563eb', borderTopColor: 'transparent' }}></div>
        <p>Syncing supplier data...</p>
      </div>
    );
  }

  return (
    <div className="admin-section">
      {error && (
        <div className="error-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      {/* Header Section */}
      <div className="admin-header" style={{ borderBottom: 'none', marginBottom: '0.5rem' }}>
        <div>
          <h2>Supplier Management</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginTop: '0.25rem' }}>
            Manage your product vendors and contact information
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-cancel" onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Download size={16} />
            <span>Export CSV</span>
          </button>
          <button className="btn-primary" onClick={() => handleOpenModal()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={16} />
            <span>Add New Supplier</span>
          </button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <div className="stats-grid">
        <div className="stat-card stat-total">
          <div className="stat-icon"><Building2 size={24} color="#2563eb" /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Total Suppliers</span>
          </div>
        </div>
        <div className="stat-card stat-active">
          <div className="stat-icon"><Check size={24} color="#16a34a" /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.active}</span>
            <span className="stat-label">Active Vendors</span>
          </div>
        </div>
        <div className="stat-card stat-out-of-stock">
          <div className="stat-icon"><X size={24} color="#d97706" /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.inactive}</span>
            <span className="stat-label">Inactive Vendors</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="search-filter-bar">
        <input 
          type="text"
          className="search-input"
          placeholder="Search by company, contact or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select 
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="filter-select"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Inactive">Inactive Only</option>
        </select>
      </div>

      {/* Table Section */}
      <div className="products-table">
        <table>
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
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontWeight: 600, color: '#111827' }}>{supplier.company_name}</span>
                    <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                      <MapPin size={12} /> {supplier.business_address}
                    </span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <User size={16} color="#9ca3af" />
                    <span>{supplier.contact_person}</span>
                  </div>
                </td>
                <td>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563' }}>
                      <Phone size={14} color="#3b82f6" />
                      <span>{supplier.phone_number}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#4b5563' }}>
                      <Mail size={14} color="#3b82f6" />
                      <span style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{supplier.email_address}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`status-badge ${supplier.status.toLowerCase()}`}>
                    {supplier.status}
                  </span>
                </td>
                <td>
                  <div className="actions-cell">
                    <button 
                      onClick={() => handleOpenModal(supplier)}
                      className="btn-edit"
                      title="Edit"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => handleDelete(supplier.id)}
                      className="btn-delete"
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredSuppliers.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
            <Building2 size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <p>No suppliers found matching your criteria.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content order-details-modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</h3>
              <button className="close-modal" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              <div className="product-form" style={{ gap: '1rem' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Company Name *</label>
                    <input
                      required
                      name="company_name"
                      value={formData.company_name}
                      onChange={handleInputChange}
                      placeholder="e.g. Blue Water Wholesale"
                    />
                  </div>
                  <div className="form-group">
                    <label>Contact Person *</label>
                    <input
                      required
                      name="contact_person"
                      value={formData.contact_person}
                      onChange={handleInputChange}
                      placeholder="e.g. John Doe"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input
                      required
                      name="phone_number"
                      value={formData.phone_number}
                      onChange={handleInputChange}
                      placeholder="e.g. +233..."
                    />
                  </div>
                  <div className="form-group">
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
                </div>

                <div className="form-group">
                  <label>Business Address *</label>
                  <input
                    required
                    name="business_address"
                    value={formData.business_address}
                    onChange={handleInputChange}
                    placeholder="Full physical address"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Tax ID / Business Reg</label>
                    <input
                      name="tax_id"
                      value={formData.tax_id}
                      onChange={handleInputChange}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    style={{ resize: 'none' }}
                    placeholder="Any additional information..."
                  />
                </div>

                <div className="form-actions" style={{ marginTop: '1rem' }}>
                  <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    <Check size={16} />
                    {editingSupplier ? 'Update Supplier' : 'Create Supplier'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
