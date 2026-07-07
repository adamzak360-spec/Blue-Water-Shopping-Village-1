export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Email is required'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'Please enter a valid email address'
  return null
}

export function validatePassword(password: string): string | null {
  if (!password) return 'Password is required'
  if (password.length < 6) return 'Password must be at least 6 characters'
  return null
}

export function validatePrice(price: string): string | null {
  if (!price) return 'Price is required'
  const num = parseFloat(price)
  if (isNaN(num) || num < 0) return 'Please enter a valid price'
  return null
}

export function validateRequired(value: string, label: string): string | null {
  if (!value.trim()) return `${label} is required`
  return null
}

export function validateNonNegativeNumber(value: string, label: string): string | null {
  if (!value) return `${label} is required`
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 0) return `Please enter a valid ${label.toLowerCase()}`
  return null
}
