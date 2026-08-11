import { supabase } from '../supabaseClient'
import { IdentityVerification, VerificationStatus } from '../types'

export const verificationService = {
  /**
   * Submit identity verification request
   */
  async submitIdentityVerification(data: {
    id_type: 'passport' | 'national_id' | 'driver_license'
    id_number?: string
    id_image_front_url: string
    id_image_back_url?: string
  }) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data: verification, error } = await supabase
      .from('identity_verifications')
      .upsert({
        user_id: user.id,
        ...data,
        status: 'pending',
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return verification as IdentityVerification
  },

  /**
   * Get current user's identity verification status
   */
  async getMyIdentityVerification() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('identity_verifications')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data as IdentityVerification | null
  },

  /**
   * Admin: List all pending verifications
   */
  async getPendingVerifications() {
    const { data, error } = await supabase
      .from('identity_verifications')
      .select('*, profiles:user_id(full_name, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })

    if (error) throw error
    return data
  },

  /**
   * Admin: Approve or Reject verification
   */
  async processVerification(id: string, status: 'approved' | 'rejected', rejectionReason?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const { data, error } = await supabase
      .from('identity_verifications')
      .update({
        status,
        rejection_reason: status === 'rejected' ? rejectionReason : null,
        verified_at: status === 'approved' ? new Date().toISOString() : null,
        verified_by: user.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data as IdentityVerification
  }
}
