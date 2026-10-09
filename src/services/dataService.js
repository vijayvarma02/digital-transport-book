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
  async getDrivers() {
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('drivers').select('*').order('name');
      if (error) throw error;
      return data || [];
    }
    return deduplicateDrivers(JSON.parse(localStorage.getItem(LOCAL_DRIVERS_KEY) || '[]'));
  },
  async addDriver(name, phone) {
    name = name.trim(); phone = phone.trim();
    if (!name || !phone) throw new Error('Driver name and phone are required');
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('drivers').insert({ name, phone }).select().single();
      if (error) throw error;
      return data;
    }
    const driver = { id: crypto.randomUUID(), name, phone };
    const drivers = await this.getDrivers(); drivers.push(driver);
    localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(drivers)); return driver;
  },
  async updateDriver(id, name, phone) {
    name = name.trim(); phone = phone.trim();
    if (!name || !phone) throw new Error('Driver name and phone are required');
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('drivers').update({ name, phone }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    }
    const drivers = await this.getDrivers(); const driver = drivers.find(d => d.id === id);
    if (!driver) throw new Error('Driver not found');
    Object.assign(driver, { name, phone }); localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(drivers)); return driver;
  },
  async deleteDriver(id) {
    const client = getSupabaseClient();
    if (client) {
      const { data: driver, error: readError } = await client.from('drivers').select('*').eq('id', id).single();
      if (readError) throw readError;
      const paths = [driver.profile_photo, ...(driver.aadhaar_photos || []), ...(driver.license_photos || [])].filter(Boolean);
      // Cascading records and the driver are deleted together by PostgreSQL.
      // Never remove photos if the database rejects the deletion.
      const { error } = await client.from('drivers').delete().eq('id', id).select('id').single();
      if (error) throw error;
      if (paths.length) {
        try {
          const { error: photoError } = await client.storage.from('driver-files').remove(paths);
          if (photoError) throw photoError;
        } catch {
          return { warning: 'Driver and records deleted. Some private photos could not be removed from storage; please ask the administrator to finish their removal.' };
        }
      }
      return {};
    }
    localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify((await this.getDrivers()).filter(d => d.id !== id)));
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(this._getLocalRecords().filter(r => r.driver_id !== id)));
  },
  async getMonthlyRecords(driverId, year, month) {
    const prefix = year + '-' + String(month).padStart(2, '0') + '-';
    const start = prefix + '01', end = prefix + String(new Date(year, month, 0).getDate());
    const client = getSupabaseClient();
    if (client) {
      const { data, error } = await client.from('daily_records').select('*').eq('driver_id', driverId).gte('date', start).lte('date', end).order('date');
      if (error) throw error; return data || [];
    }
    return this._getLocalRecords().filter(r => r.driver_id === driverId && r.date >= start && r.date <= end);
  },
  async saveDailyRecord(driverId, date, amount, pendingAmount = 0, notes = '') {
    if (typeof notes !== 'string' || notes.length > 1000) throw new Error('Notes must be 1,000 characters or fewer');
    const cleanNotes = notes.trim();
    const clear = (amount === null || amount === undefined || amount === '') && !cleanNotes;
    const record = { driver_id: driverId, date, amount: Number(amount), pending_amount: Number(pendingAmount || 0), notes: cleanNotes, updated_at: new Date().toISOString() };
    if (!clear && (!Number.isFinite(record.amount) || record.amount < 0 || !Number.isFinite(record.pending_amount) || record.pending_amount < 0)) throw new Error('Enter valid non-negative amounts');
    const client = getSupabaseClient();
    if (client) {
      const result = clear ? await client.from('daily_records').delete().match({ driver_id: driverId, date }) : await client.from('daily_records').upsert(record, { onConflict: 'driver_id,date' }).select().single();
      if (result.error) throw result.error;
      return { success: true, record: result.data, removed: clear };
    }
    const records = this._getLocalRecords().filter(r => !(r.driver_id === driverId && r.date === date));
    if (!clear) records.push({ ...record, id: crypto.randomUUID() });
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(records)); return { success: true, record, removed: clear };
  },
  _getLocalRecords() { return JSON.parse(localStorage.getItem(LOCAL_RECORDS_KEY) || '[]'); },
  resetDemoData() {
    localStorage.setItem(LOCAL_DRIVERS_KEY, JSON.stringify(DEFAULT_DRIVERS));
    localStorage.setItem(LOCAL_RECORDS_KEY, JSON.stringify(getInitialSampleRecords()));
  }
};
