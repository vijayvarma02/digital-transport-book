import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

const DEFAULT_DRIVERS = [
  { id: '11111111-1111-4111-8111-111111111101', name: 'Ramesh', phone: '9848012345' },
  { id: '11111111-1111-4111-8111-111111111102', name: 'Suresh', phone: '9848023456' },
  { id: '11111111-1111-4111-8111-111111111103', name: 'Mahesh', phone: '9848034567' },
  { id: '11111111-1111-4111-8111-111111111104', name: 'Ravi', phone: '9848045678' },
  { id: '11111111-1111-4111-8111-111111111105', name: 'Kiran', phone: '9848056789' },
  { id: '11111111-1111-4111-8111-111111111106', name: 'Anil', phone: '9848067890' },
  { id: '11111111-1111-4111-8111-111111111107', name: 'Rajesh', phone: '9848078901' },
  { id: '11111111-1111-4111-8111-111111111108', name: 'Srinu', phone: '9848089012' },
  { id: '11111111-1111-4111-8111-111111111109', name: 'Vijay', phone: '9848090123' },
  { id: '11111111-1111-4111-8111-111111111110', name: 'Naresh', phone: '9848099999' },
];

const LOCAL_DRIVERS_KEY = 'dtb_drivers_v1';
const LOCAL_RECORDS_KEY = 'dtb_records_v1';

// Seed sample records for Ramesh matching prompt's example (Oct 01 - Oct 08)
const getInitialSampleRecords = () => {
  const rameshId = DEFAULT_DRIVERS[0].id;
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');

  // Days 1 to 8 sample data
  const sampleAmounts = [800, 800, 750, 800, 800, 750, 800, 800];
  const records = [];

  sampleAmounts.forEach((amt, index) => {
    const day = String(index + 1).padStart(2, '0');
    records.push({
      id: `sample-rec-${index + 1}`,
      driver_id: rameshId,
      date: `${year}-${month}-${day}`,
      amount: amt,
    });
  });

  // Add some sample records for Suresh and Mahesh as well
  const sureshId = DEFAULT_DRIVERS[1].id;
  records.push(
    { id: 'sample-suresh-1', driver_id: sureshId, date: `${year}-${month}-01`, amount: 850 },
    { id: 'sample-suresh-2', driver_id: sureshId, date: `${year}-${month}-02`, amount: 850 },
    { id: 'sample-suresh-8', driver_id: sureshId, date: `${year}-${month}-08`, amount: 850 },
  );

  return records;
};

// Initialize localStorage if empty
const initLocalStorage = () => {
  if (!localStorage.getItem(LOCAL_DRIVERS_KEY)) {
    localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(DEFAULT_DRIVERS));
  }
  if (!localStorage.getItem(LOCAL_RECORDS_KEY)) {
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(getInitialSampleRecords()));
  }
};

// Initialize right away
initLocalStorage();

export const dataService = {
  isConfigured: () => isSupabaseConfigured(),

  // Get all drivers
  async getDrivers() {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .order('name');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          return data;
        } else {
          // If Supabase table is empty, seed default drivers
          const { data: inserted, error: insertErr } = await supabase
            .from('drivers')
            .insert(DEFAULT_DRIVERS.map(d => ({ name: d.name, phone: d.phone })))
            .select();
          if (!insertErr && inserted) {
            return inserted;
          }
        }
      } catch (err) {
        console.warn('Supabase fetchDrivers error, falling back to local storage:', err);
      }
    }

    // Local fallback
    try {
      const stored = localStorage.getItem(LOCAL_DRIVERS_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_DRIVERS;
    } catch {
      return DEFAULT_DRIVERS;
    }
  },

  // Add a new driver
  async addDriver(name, phone = '') {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Driver name is required');

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .insert({ name: trimmedName, phone: phone.trim() || null })
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase addDriver error:', err);
      }
    }

    // Local fallback
    const drivers = await this.getDrivers();
    const newDriver = {
      id: crypto.randomUUID ? crypto.randomUUID() : `driver-${Date.now()}`,
      name: trimmedName,
      phone: phone.trim() || null,
      created_at: new Date().toISOString(),
    };
    drivers.push(newDriver);
    localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(drivers));
    return newDriver;
  },

  // Update an existing driver
  async updateDriver(id, name, phone = '') {
    const trimmedName = name.trim();
    if (!trimmedName) throw new Error('Driver name is required');

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .update({ name: trimmedName, phone: phone.trim() || null })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } catch (err) {
        console.warn('Supabase updateDriver error:', err);
      }
    }

    const drivers = await this.getDrivers();
    const index = drivers.findIndex(d => d.id === id);
    if (index !== -1) {
      drivers[index] = { ...drivers[index], name: trimmedName, phone: phone.trim() || null };
      localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(drivers));
      return drivers[index];
    }
    throw new Error('Driver not found');
  },

  // Delete a driver
  async deleteDriver(id) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { error } = await supabase.from('drivers').delete().eq('id', id);
        if (error) throw error;
        return true;
      } catch (err) {
        console.warn('Supabase deleteDriver error:', err);
      }
    }

    const drivers = await this.getDrivers();
    const filtered = drivers.filter(d => d.id !== id);
    localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(filtered));

    // Also remove driver's daily records in local storage
    const records = this._getLocalRecords().filter(r => r.driver_id !== id);
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records));
    return true;
  },

  // Fetch all daily records for a specific driver and month (year: 2026, month: 10)
  async getMonthlyRecords(driverId, year, month) {
    const formattedMonth = String(month).padStart(2, '0');
    const startDate = `${year}-${formattedMonth}-01`;
    // Last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${formattedMonth}-${String(lastDay).padStart(2, '0')}`;

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('daily_records')
          .select('*')
          .eq('driver_id', driverId)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date');
        
        if (error) throw error;
        return data || [];
      } catch (err) {
        console.warn('Supabase getMonthlyRecords error, using local:', err);
      }
    }

    // Local fallback
    const records = this._getLocalRecords();
    return records.filter(r => {
      return r.driver_id === driverId && r.date >= startDate && r.date <= endDate;
    });
  },

  // Save or update a single daily record (upsert)
  // If amount is null or empty string, remove the record
  async saveDailyRecord(driverId, date, amount) {
    const supabase = getSupabaseClient();

    // If clearing amount
    if (amount === null || amount === undefined || amount === '') {
      if (supabase) {
        try {
          const { error } = await supabase
            .from('daily_records')
            .delete()
            .match({ driver_id: driverId, date });
          if (error) throw error;
          return { success: true, removed: true };
        } catch (err) {
          console.warn('Supabase delete daily record error:', err);
        }
      }

      // Local remove
      const records = this._getLocalRecords();
      const filtered = records.filter(r => !(r.driver_id === driverId && r.date === date));
      localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(filtered));
      return { success: true, removed: true };
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount < 0) {
      throw new Error('Please enter a valid amount');
    }

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('daily_records')
          .upsert(
            {
              driver_id: driverId,
              date,
              amount: numAmount,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'driver_id,date' }
          )
          .select()
          .single();

        if (error) throw error;
        return { success: true, record: data };
      } catch (err) {
        console.warn('Supabase upsert error, saving locally:', err);
      }
    }

    // Local upsert
    const records = this._getLocalRecords();
    const existingIndex = records.findIndex(r => r.driver_id === driverId && r.date === date);

    if (existingIndex !== -1) {
      records[existingIndex] = {
        ...records[existingIndex],
        amount: numAmount,
        updated_at: new Date().toISOString(),
      };
    } else {
      records.push({
        id: crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}`,
        driver_id: driverId,
        date,
        amount: numAmount,
        created_at: new Date().toISOString(),
      });
    }

    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records));
    return { success: true, amount: numAmount };
  },

  // Helper to get local records safely
  _getLocalRecords() {
    try {
      const stored = localStorage.getItem(LOCAL_RECORDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  // Fetch today's records for all drivers (to show today's status on Driver List)
  async getTodayRecordsForAllDrivers(todayDateString) {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('daily_records')
          .select('driver_id, amount')
          .eq('date', todayDateString);
        if (!error && data) {
          const map = {};
          data.forEach(item => {
            map[item.driver_id] = item.amount;
          });
          return map;
        }
      } catch (err) {
        console.warn('Supabase getTodayRecords error:', err);
      }
    }

    // Local fallback
    const records = this._getLocalRecords();
    const map = {};
    records.forEach(r => {
      if (r.date === todayDateString) {
        map[r.driver_id] = r.amount;
      }
    });
    return map;
  },

  // Reset to default sample data (for easy testing)
  resetDemoData() {
    localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(DEFAULT_DRIVERS));
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(getInitialSampleRecords()));
  }
};
