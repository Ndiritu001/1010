-- Brisa Motors — Supabase / PostgreSQL Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query → paste & Run

-- ── Clients (users) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clients (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  phone       TEXT,
  role        TEXT DEFAULT 'client',
  created_at  TEXT DEFAULT to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- ── Cars ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cars (
  id           SERIAL PRIMARY KEY,
  make         TEXT,
  model        TEXT,
  year         INTEGER,
  price        NUMERIC,
  mileage      INTEGER,
  color        TEXT,
  engine       TEXT,
  hp           INTEGER,
  turbo        BOOLEAN DEFAULT false,
  drive        TEXT,
  body         TEXT,
  transmission TEXT,
  fuel_type    TEXT,
  seats        INTEGER,
  doors        INTEGER,
  cylinders    INTEGER,
  description  TEXT,
  images       TEXT[],
  quantity     INTEGER DEFAULT 1,
  status       TEXT DEFAULT 'available'
);

-- ── Parts ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts (
  id               SERIAL PRIMARY KEY,
  name             TEXT,
  part_number      TEXT,
  category         TEXT,
  price            NUMERIC,
  stock            INTEGER DEFAULT 0,
  compatible_makes TEXT,
  description      TEXT
);

-- ── Appointments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id               SERIAL PRIMARY KEY,
  client_id        INTEGER REFERENCES clients(id),
  appointment_date TEXT,
  time_slot        TEXT,
  service_type     TEXT,
  car_make         TEXT,
  car_model        TEXT,
  car_year         TEXT,
  car_plate        TEXT,
  notes            TEXT,
  status           TEXT DEFAULT 'scheduled',
  created_at       TEXT DEFAULT to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- ── Repairs ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS repairs (
  id             SERIAL PRIMARY KEY,
  appointment_id INTEGER,
  client_id      INTEGER REFERENCES clients(id),
  car_plate      TEXT,
  diagnosis      TEXT,
  parts_used     JSONB DEFAULT '[]',
  labor_hours    NUMERIC DEFAULT 0,
  total_cost     NUMERIC,
  mechanic_notes TEXT,
  payment_status TEXT DEFAULT 'unpaid',
  resolved_at    TEXT DEFAULT to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- ── Payments ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id             SERIAL PRIMARY KEY,
  client_id      INTEGER REFERENCES clients(id),
  payment_type   TEXT,
  reference_id   INTEGER,
  quantity       INTEGER DEFAULT 1,
  amount         NUMERIC,
  method         TEXT,
  paystack_ref   TEXT,
  paystack_code  TEXT,
  status         TEXT DEFAULT 'pending',
  paid_at        TEXT,
  created_at     TEXT DEFAULT to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  invoice_id     INTEGER,
  invoice_number TEXT
);

-- ── Invoices ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             SERIAL PRIMARY KEY,
  invoice_number TEXT,
  client_id      INTEGER REFERENCES clients(id),
  payment_id     INTEGER,
  invoice_type   TEXT,
  reference_id   INTEGER,
  line_items     JSONB DEFAULT '[]',
  subtotal       TEXT,
  tax_rate       NUMERIC,
  tax_amount     TEXT,
  total_amount   TEXT,
  status         TEXT DEFAULT 'paid',
  issued_at      TEXT DEFAULT to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
);

-- ── Password Resets ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS resets (
  id      SERIAL PRIMARY KEY,
  email   TEXT,
  token   TEXT,
  expires TEXT,
  used    BOOLEAN DEFAULT false
);

-- ── Seed: Admin account (password: Admin@1234) ────────────────────
INSERT INTO clients (name, email, password, phone, role)
VALUES (
  'Brisa Admin',
  'admin@brisamotors.co.ke',
  '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh/.',
  NULL,
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- ── Seed: Cars ────────────────────────────────────────────────────
INSERT INTO cars (make,model,year,price,mileage,color,engine,hp,turbo,drive,body,transmission,fuel_type,seats,doors,cylinders,description,images,quantity,status) VALUES
('Toyota','Corolla',2020,1850000,52000,'Pearl White','1.8L VVT-i 4-cyl',140,false,'FWD','Sedan','automatic','Petrol',5,4,4,'Well maintained, full service history. One careful owner from new.',ARRAY['IMGS/car22.jpg'],2,'available'),
('Toyota','Hilux',2019,3200000,74000,'Silver','2.4L Diesel Turbo 4-cyl',150,true,'4WD','Pickup','manual','Diesel',5,4,4,'4x4 Double Cab with tow bar. Serviced every 5,000km at Toyota Kenya.',ARRAY['IMGS/hilux.jpg'],1,'available'),
('Mazda','CX-5',2021,2700000,38000,'Machine Grey','2.0L SKYACTIV-G 4-cyl',165,false,'FWD','SUV','automatic','Petrol',5,5,4,'Bose audio, heated seats, i-ACTIVSENSE safety suite.',ARRAY['IMGS/mazda.jpg'],1,'available'),
('BMW','3 Series',2018,3500000,88000,'Black Sapphire','2.0L TwinPower Turbo 4-cyl',184,true,'RWD','Sedan','automatic','Petrol',5,4,4,'Navigation panel, leather seats, HUD. Full service history.',ARRAY['IMGS/kawasaki.jpg'],1,'available'),
('Subaru','Forester',2020,2100000,61000,'Crystal White','2.5L BOXER 4-cyl',182,false,'AWD','SUV','automatic','Petrol',5,5,4,'EyeSight, Symmetrical AWD, panoramic sunroof.',ARRAY['IMGS/subaru.jpg'],0,'sold_out'),
('Mercedes','C-Class',2019,4200000,55000,'Obsidian Black','2.0L EQ Boost Turbo 4-cyl',204,true,'RWD','Sedan','automatic','Petrol',5,4,4,'AMG Line, Burmester sound, panoramic roof. Full MBSL service history.',ARRAY['IMGS/sclass.jpg'],1,'available'),
('Honda','CR-V',2022,3100000,22000,'Lunar Silver','1.5L VTEC Turbo 4-cyl',190,true,'FWD','SUV','automatic','Petrol',5,5,4,'Honda Sensing, hands-free tailgate, wireless CarPlay. Like new.',ARRAY['IMGS/car7.jpg'],2,'available'),
('Nissan','X-Trail',2021,2650000,41000,'Pearl White','2.5L DOHC 4-cyl',169,false,'4WD','SUV','automatic','Petrol',7,5,4,'7-seater 4x4. ProPILOT assist, Around View Monitor.',ARRAY['IMGS/car8.jpg'],1,'available'),
('Land Rover','Discovery',2020,5800000,67000,'Indus Silver','3.0L Td6 Diesel V6',258,true,'4WD','SUV','automatic','Diesel',7,5,6,'Full spec Discovery, Terrain Response 2, dual panoramic sunroofs.',ARRAY['IMGS/rover.jpg'],1,'available'),
('Kawasaki','Ninja',2021,4500000,33000,'Green','2.0L TFSI Turbo 4-cyl',249,true,'AWD','Sport','manual','Petrol',2,0,4,'Quattro AWD, Bang & Olufsen 3D Sound, Matrix LED headlights.',ARRAY['IMGS/car4.jpg'],1,'available'),
('Kia','Sportage',2022,2400000,18000,'Snow White','1.6L T-GDi Turbo 4-cyl',177,true,'FWD','SUV','automatic','Petrol',5,5,4,'Smart Sense safety, 10.25" panoramic display. Low mileage, like new.',ARRAY['IMGS/kia.jpg'],2,'available'),
('Volkswagen','Tiguan',2021,3800000,45000,'Reflex Silver','1.4L TSI EVO Turbo 4-cyl',150,true,'4WD','SUV','automatic','Petrol',5,5,4,'4Motion AWD, Digital Cockpit Pro, IQ.DRIVE, panoramic roof.',ARRAY['IMGS/tiguan.jpg'],1,'available');

-- ── Seed: Parts ───────────────────────────────────────────────────
INSERT INTO parts (name,part_number,category,price,stock,compatible_makes,description) VALUES
('Oil Filter','OF-001','Engine',1500,50,'Toyota,Honda,Mazda','Standard spin-on oil filter, OEM quality.'),
('Brake Pads (Front)','BP-F02','Brakes',4500,30,'Toyota,Subaru','Ceramic compound, low dust, OEM spec.'),
('Air Filter','AF-003','Engine',2200,40,'Toyota,Honda,Nissan','High-flow OEM equivalent air filter.'),
('Alternator Belt','AB-004','Electrical',3800,20,'Toyota,Mazda','Reinforced V-belt, genuine quality.'),
('Shock Absorber (Front)','SA-005','Suspension',12000,15,'Toyota,Honda','Gas-charged front shock absorber.'),
('Radiator','RD-006','Cooling',15000,0,'Toyota,Mazda','Aluminium core 3-row radiator. OUT OF STOCK.');
