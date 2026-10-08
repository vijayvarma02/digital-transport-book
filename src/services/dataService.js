import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

const DEFAULT_DRIVERS = [
  { id: '11111111-1111-4111-8111-111111111101', name: 'Ramesh', phone: '9848011223' },
  { id: '11111111-1111-4111-8111-111111111102', name: 'Suresh', phone: '9848022334' },
  { id: '11111111-1111-4111-8111-111111111103', name: 'Mahesh', phone: '9848033445' },
  { id: '11111111-1111-4111-8111-111111111104', name: 'Ravi', phone: '9848044556' },
  { id: '11111111-1111-4111-8111-111111111105', name: 'Kiran', phone: '9848055667' },
  { id: '11111111-1111-4111-8111-111111111106', name: 'Anil', phone: '9848066778' },
  { id: '11111111-1111-4111-8111-111111111107', name: 'Rajesh', phone: '9848077889' },
  { id: '11111111-1111-4111-8111-111111111108', name: 'Srinu', phone: '9848088990' },
  { id: '11111111-1111-4111-8111-111111111109', name: 'Vijay', phone: '9848099001' },
  { id: '11111111-1111-4111-8111-111111111110', name: 'Naresh', phone: '9848012349' },
];

const LOCAL_DRIVERS_KEY = 'dtb_drivers_v2';
const LOCAL_RECORDS_KEY = 'dtb_records_v2';

// Deduplicate helper
const deduplicateDrivers = (driversList) => {
  const seen = new Set();
  return driversList.filter((d) => {
    const key = d.name.trim().toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

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

initLocalStorage();

export const dataService = {
  isConfigured: () => isSupabaseConfigured(),

  // Get all drivers (always deduplicated)
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
          return deduplicateDrivers(data);
        } else {
          // If Supabase table is empty, seed default drivers
          const { data: inserted, error: insertErr } = await supabase
            .from('drivers')
            .insert(DEFAULT_DRIVERS.map(d => ({ name: d.name, phone: d.phone })))
            .select();
          if (!insertErr && inserted) {
            return deduplicateDrivers(inserted);
          }
        }
      } catch (err) {
        console.warn('Supabase fetchDrivers error, falling back to local storage:', err);
      }
    }

    // Local fallback
    try {
      const stored = localStorage.getItem(LOCAL_DRIVERS_KEY);
      const parsed = stored ? JSON.parse(stored) : DEFAULT_DRIVERS;
      return deduplicateDrivers(parsed);
    } catch {
      return DEFAULT_DRIVERS;
    }
  },

  // Add a new driver (phone is mandatory)
  async addDriver(name, phone) {
    const trimmedName = name.trim();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedName) throw new Error('Driver name is required');
    if (!trimmedPhone) throw new Error('Phone number is required');

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .insert({ name: trimmedName, phone: trimmedPhone })
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
      phone: trimmedPhone,
      created_at: new Date().toISOString(),
    };
    drivers.push(newDriver);
    localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(drivers));
    return newDriver;
  },

  // Update an existing driver
  async updateDriver(id, name, phone) {
    const trimmedName = name.trim();
    const trimmedPhone = (phone || '').trim();

    if (!trimmedName) throw new Error('Driver name is required');
    if (!trimmedPhone) throw new Error('Phone number is required');

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .update({ name: trimmedName, phone: trimmedPhone })
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
      drivers[index] = { ...drivers[index], name: trimmedName, phone: trimmedPhone };
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

    const records = this._getLocalRecords().filter(r => r.driver_id !== id);
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records));
    return true;
  },

  // Fetch all daily records for a specific driver and month
  async getMonthlyRecords(driverId, year, month) {
    const formattedMonth = String(month).padStart(2, '0');
    const startDate = `${year}-${formattedMonth}-01`;
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

  // Save or update a single daily record
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
        // First try standard upsert
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

        if (!error && data) {
          return { success: true, record: data };
        }

        // Fallback: If unique constraint is missing on Supabase (error 42P10),
        // safely check existing row and update or insert:
        const { data: existing } = await supabase
          .from('daily_records')
          .select('id')
          .eq('driver_id', driverId)
          .eq('date', date)
          .maybeSingle();

        if (existing) {
          const { data: updated, error: uErr } = await supabase
            .from('daily_records')
            .update({ amount: numAmount, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
            .select()
            .single();
          if (!uErr && updated) return { success: true, record: updated };
        } else {
          const { data: inserted, error: iErr } = await supabase
            .from('daily_records')
            .insert({ driver_id: driverId, date, amount: numAmount })
            .select()
            .single();
          if (!iErr && inserted) return { success: true, record: inserted };
        }
      } catch (err) {
        console.warn('Supabase saveDailyRecord error:', err);
      }
    }

    // Local storage fallback
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

  _getLocalRecords() {
    try {
      const stored = localStorage.getItem(LOCAL_RECORDS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },

  resetDemoData() {
    localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(DEFAULT_DRIVERS));
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(getInitialSampleRecords()));
  }
};
