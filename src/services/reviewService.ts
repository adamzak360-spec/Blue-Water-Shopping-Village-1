import { supabase, isSupabaseConfigured } from '../supabaseClient'
import type { Review } from '../types'

export const getApprovedReviewsByProductId = async (productId: string): Promise<Review[]> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Review[]) || []
}

export const submitReview = async (review: Omit<Review, 'id' | 'created_at' | 'status'>): Promise<Review> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('reviews')
    .insert([{ ...review, status: 'pending' }])
    .select()
    .single()

  if (error) throw error
  return data as Review
}

export const getAllReviews = async (): Promise<Review[]> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as Review[]) || []
}

export const updateReviewStatus = async (reviewId: string, status: 'approved' | 'hidden'): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase
    .from('reviews')
    .update({ status })
    .eq('id', reviewId)

  if (error) throw error
}

export const deleteReview = async (reviewId: string): Promise<void> => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)

  if (error) throw error
}

export const getProductRatingStats = async (productId: string) => {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('product_id', productId)
    .eq('status', 'approved')

  if (error) throw error

  if (!data || data.length === 0) {
    return { averageRating: 0, totalReviews: 0 }
  }

  const totalReviews = data.length
  const sumRating = data.reduce((acc, curr) => acc + curr.rating, 0)
  const averageRating = parseFloat((sumRating / totalReviews).toFixed(1))

  return { averageRating, totalReviews }
}
