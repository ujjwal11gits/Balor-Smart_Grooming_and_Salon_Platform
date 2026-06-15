/**
 * Calculates whether the salon is currently active (open) based on opening and closing times.
 * Supports standard shifts (e.g., 09:00 - 21:00) and overnight shifts (e.g., 21:00 - 04:00).
 * 
 * @param {string} openingTime - e.g. "09:00"
 * @param {string} closingTime - e.g. "21:00"
 * @returns {boolean} True if the current local time falls within the shop's operating hours, otherwise false.
 */
export function isShopActive(openingTime, closingTime) {
  if (!openingTime || !closingTime) return false;

  const now = new Date();
  const currentHours = now.getHours();
  const currentMinutes = now.getMinutes();
  const currentTotalMinutes = currentHours * 60 + currentMinutes;

  const [opH, opM] = openingTime.split(':').map(Number);
  const [clH, clM] = closingTime.split(':').map(Number);
  
  if (isNaN(opH) || isNaN(opM) || isNaN(clH) || isNaN(clM)) {
    return false;
  }

  const openTotalMinutes = opH * 60 + opM;
  const closeTotalMinutes = clH * 60 + clM;

  if (openTotalMinutes < closeTotalMinutes) {
    // Standard shift, e.g. 09:00 to 21:00
    return currentTotalMinutes >= openTotalMinutes && currentTotalMinutes <= closeTotalMinutes;
  } else {
    // Overnight shift, e.g. 21:00 to 04:00 (next day)
    return currentTotalMinutes >= openTotalMinutes || currentTotalMinutes <= closeTotalMinutes;
  }
}

/**
 * Formats a time string in HH:MM format to a user-friendly 12-hour AM/PM string.
 * 
 * @param {string} timeStr - e.g. "13:30" or "09:00"
 * @returns {string} e.g. "1:30 PM" or "9:00 AM"
 */
export function formatTime12(timeStr) {
  if (!timeStr) return '';
  const [hoursStr, minutesStr] = timeStr.split(':');
  const hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  
  if (isNaN(hours) || isNaN(minutes)) return timeStr;
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

/**
 * Formats a salon's location details into a single clean address string without repeating city/state/zip if already inside the address.
 * 
 * @param {object} salon 
 * @returns {string} Formatted address
 */
export function formatAddress(salon) {
  if (!salon) return 'No address configured';
  const parts = [];
  if (salon.address) parts.push(salon.address.trim());
  if (salon.city && (!salon.address || !salon.address.toLowerCase().includes(salon.city.toLowerCase()))) {
    parts.push(salon.city.trim());
  }
  if (salon.state && (!salon.address || !salon.address.toLowerCase().includes(salon.state.toLowerCase()))) {
    parts.push(salon.state.trim());
  }
  if (salon.zipCode && (!salon.address || !salon.address.toLowerCase().includes(salon.zipCode.trim()))) {
    parts.push(salon.zipCode.trim());
  }
  return parts.filter(Boolean).join(', ') || 'No address configured';
}
