export const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Get formatted today string: "YYYY-MM-DD"
export const getTodayDateString = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format currency: 800 -> "₹800", 5700 -> "₹5,700"
export const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || amount === '' || isNaN(amount)) {
    return '—';
  }
  const num = Number(amount);
  return `₹${num.toLocaleString('en-IN')}`;
};

// Generate list of all calendar days in a given month
export const getDaysInMonth = (year, month) => {
  // month is 1-indexed (1 = Jan, 10 = Oct)
  const totalDays = new Date(year, month, 0).getDate();
  const todayStr = getTodayDateString();
  const days = [];

  for (let day = 1; day <= totalDays; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const dateString = `${year}-${monthStr}-${dayStr}`;
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = DAYS_SHORT[dateObj.getDay()];
    const monthShort = MONTH_NAMES_SHORT[month - 1];

    days.push({
      day,
      dateString,
      displayDate: `${monthShort} ${dayStr}`,
      dayOfWeek,
      isToday: dateString === todayStr,
      isFuture: dateString > todayStr,
    });
  }

  return days;
};

// Format full date for modal header: "Oct 08, 2026 (Today)"
export const formatModalDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const monthShort = MONTH_NAMES_SHORT[month - 1];
  const dayStr = String(day).padStart(2, '0');
  const dayOfWeek = DAYS_SHORT[dateObj.getDay()];
  const isToday = dateString === getTodayDateString();

  return `${dayOfWeek}, ${monthShort} ${dayStr}${isToday ? ' (Today)' : ''}`;
};
