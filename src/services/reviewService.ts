import { supabase } from '../supabaseClient'
import type { Review } from '../types'

export const getApprovedReviewsByProductId = async (productId: string): Promise<Review[]> => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const submitReview = async (review: Omit<Review, 'id' | 'created_at' | 'status'>): Promise<Review> => {
  const { data, error } = await supabase
    .from('reviews')
    .insert([{ ...review, status: 'pending' }])
    .select()
    .single()

  if (error) throw error
  return data
}

export const getAllReviews = async (): Promise<Review[]> => {
  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export const updateReviewStatus = async (reviewId: string, status: 'approved' | 'hidden'): Promise<void> => {
  const { error } = await supabase
    .from('reviews')
    .update({ status })
    .eq('id', reviewId)

  if (error) throw error
}

export const deleteReview = async (reviewId: string): Promise<void> => {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId)

  if (error) throw error
}

export const getProductRatingStats = async (productId: string) => {
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
