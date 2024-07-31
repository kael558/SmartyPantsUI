export function wrapSuccess(data) {
  return { success: true, data };
}

export function wrapError(error) {
  return { error };
}