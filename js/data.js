/* ============================================================
   WarehouseOS — data.js
   Seed data: products, orders, staff, zones, warehouse map
   ============================================================ */

const SeedData = (() => {

  const zones = ['A','B','C','D','E','F'];

  const zoneInfo = {
    A: { name: 'Electronics & Components', color: 'hsl(210,80%,50%)', rows: 5, cols: 5 },
    B: { name: 'Hardware & Tools',          color: 'hsl(142,70%,45%)', rows: 5, cols: 5 },
    C: { name: 'Packaging Materials',       color: 'hsl(38,90%,54%)',  rows: 5, cols: 5 },
    D: { name: 'Safety Equipment',          color: 'hsl(0,80%,58%)',   rows: 5, cols: 5 },
    E: { name: 'Office Supplies',           color: 'hsl(265,70%,60%)', rows: 5, cols: 5 },
    F: { name: 'Machinery Parts',           color: 'hsl(180,70%,45%)', rows: 5, cols: 5 },
  };

  const staff = [
    { id: 'ST-001', name: 'Alex Rivera',    initials: 'AR', role: 'Senior Picker', zone: 'A', tasksCompleted: 312, accuracy: 99.1, avgPickTime: 3.8, status: 'active' },
    { id: 'ST-002', name: 'Jordan Kim',     initials: 'JK', role: 'Picker',        zone: 'B', tasksCompleted: 245, accuracy: 97.4, avgPickTime: 4.5, status: 'active' },
    { id: 'ST-003', name: 'Sam Okafor',     initials: 'SO', role: 'Picker',        zone: 'C', tasksCompleted: 189, accuracy: 98.6, avgPickTime: 4.1, status: 'active' },
    { id: 'ST-004', name: 'Dana Patel',     initials: 'DP', role: 'Packer',        zone: 'D', tasksCompleted: 401, accuracy: 99.8, avgPickTime: 3.2, status: 'active' },
    { id: 'ST-005', name: 'Morgan Lee',     initials: 'ML', role: 'Picker',        zone: 'E', tasksCompleted: 156, accuracy: 96.5, avgPickTime: 5.2, status: 'break' },
    { id: 'ST-006', name: 'Casey Torres',   initials: 'CT', role: 'Packer',        zone: 'F', tasksCompleted: 278, accuracy: 98.2, avgPickTime: 4.0, status: 'active' },
  ];

  const products = [
    // Zone A — Electronics
    { id:'PRD-001', sku:'ELC-MCU-328',  name:'Arduino Mega Microcontroller',    category:'Electronics', zone:'A', bin:'A-01-02', quantity:85,  reorderPoint:20, maxCapacity:200, unitPrice:32.99, weight:0.08, supplier:'TechSource Ltd',    lastRestocked:'2026-08-10', status:'active' },
    { id:'PRD-002', sku:'ELC-CAP-470U', name:'470µF Electrolytic Capacitor (pk/100)', category:'Electronics', zone:'A', bin:'A-01-04', quantity:340, reorderPoint:100,maxCapacity:500, unitPrice:8.50,  weight:0.2,  supplier:'CircuitPro',        lastRestocked:'2026-08-08', status:'active' },
    { id:'PRD-003', sku:'ELC-SEN-DHT22',name:'DHT22 Temp/Humidity Sensor',      category:'Electronics', zone:'A', bin:'A-02-01', quantity:12,  reorderPoint:15, maxCapacity:100, unitPrice:11.20, weight:0.01, supplier:'SensorWorld',       lastRestocked:'2026-07-25', status:'active' },
    { id:'PRD-004', sku:'ELC-MOD-ESP32', name:'ESP32 WiFi+BT Module',            category:'Electronics', zone:'A', bin:'A-02-03', quantity:67,  reorderPoint:25, maxCapacity:150, unitPrice:18.75, weight:0.01, supplier:'TechSource Ltd',    lastRestocked:'2026-08-05', status:'active' },
    { id:'PRD-005', sku:'ELC-LED-RGB5K', name:'RGB LED Strip 5m IP65',           category:'Electronics', zone:'A', bin:'A-03-01', quantity:28,  reorderPoint:10, maxCapacity:80,  unitPrice:24.50, weight:0.3,  supplier:'LightTech Inc',     lastRestocked:'2026-08-01', status:'active' },
    { id:'PRD-006', sku:'ELC-BAT-18650', name:'18650 Li-Ion Battery 3000mAh',    category:'Electronics', zone:'A', bin:'A-03-03', quantity:145, reorderPoint:50, maxCapacity:300, unitPrice:6.99,  weight:0.045,supplier:'PowerCell Co',       lastRestocked:'2026-08-12', status:'active' },
    { id:'PRD-007', sku:'ELC-RLY-5VDC',  name:'5V DC Relay Module 10A',          category:'Electronics', zone:'A', bin:'A-04-02', quantity:0,   reorderPoint:20, maxCapacity:100, unitPrice:4.25,  weight:0.05, supplier:'CircuitPro',        lastRestocked:'2026-07-20', status:'active' },
    { id:'PRD-008', sku:'ELC-PWR-24V5A', name:'24V 5A Switching Power Supply',   category:'Electronics', zone:'A', bin:'A-04-04', quantity:19,  reorderPoint:8,  maxCapacity:40,  unitPrice:42.00, weight:0.85, supplier:'PowerCell Co',       lastRestocked:'2026-08-03', status:'active' },
    { id:'PRD-009', sku:'ELC-CAB-USB3M', name:'USB-C to USB-A Cable 3m',         category:'Electronics', zone:'A', bin:'A-05-01', quantity:210, reorderPoint:60, maxCapacity:400, unitPrice:3.50,  weight:0.1,  supplier:'CableWorks',        lastRestocked:'2026-08-11', status:'active' },
    { id:'PRD-010', sku:'ELC-PCB-PROTO', name:'Double-Side PCB Prototyping Board',category:'Electronics', zone:'A', bin:'A-05-05', quantity:88,  reorderPoint:30, maxCapacity:200, unitPrice:2.80,  weight:0.06, supplier:'CircuitPro',        lastRestocked:'2026-08-09', status:'active' },
    // Zone B — Hardware
    { id:'PRD-011', sku:'HRD-BLT-M8x40', name:'M8×40mm Hex Bolt (pk/50)',       category:'Hardware',    zone:'B', bin:'B-01-01', quantity:420, reorderPoint:100,maxCapacity:800, unitPrice:12.00, weight:0.6,  supplier:'MetalWorks Inc',    lastRestocked:'2026-08-07', status:'active' },
    { id:'PRD-012', sku:'HRD-NUT-M8',    name:'M8 Hex Nut (pk/100)',             category:'Hardware',    zone:'B', bin:'B-01-03', quantity:550, reorderPoint:150,maxCapacity:1000,unitPrice:6.50,  weight:0.4,  supplier:'MetalWorks Inc',    lastRestocked:'2026-08-07', status:'active' },
    { id:'PRD-013', sku:'HRD-DRL-10MM',  name:'10mm Tungsten Carbide Drill Bit', category:'Hardware',    zone:'B', bin:'B-02-01', quantity:34,  reorderPoint:10, maxCapacity:80,  unitPrice:15.99, weight:0.12, supplier:'ToolMaster Pro',    lastRestocked:'2026-07-30', status:'active' },
    { id:'PRD-014', sku:'HRD-WRN-SET12', name:'Combination Wrench Set 12pc',     category:'Hardware',    zone:'B', bin:'B-02-04', quantity:15,  reorderPoint:5,  maxCapacity:40,  unitPrice:68.00, weight:2.1,  supplier:'ToolMaster Pro',    lastRestocked:'2026-07-28', status:'active' },
    { id:'PRD-015', sku:'HRD-TAP-SET',   name:'M3-M12 Tap & Die Set',            category:'Hardware',    zone:'B', bin:'B-03-02', quantity:22,  reorderPoint:6,  maxCapacity:50,  unitPrice:89.99, weight:1.8,  supplier:'PrecisionTools',    lastRestocked:'2026-08-01', status:'active' },
    { id:'PRD-016', sku:'HRD-WLD-EL312', name:'E6013 Welding Electrodes 3.2mm(pk/5kg)',category:'Hardware',zone:'B',bin:'B-03-05', quantity:31,  reorderPoint:8,  maxCapacity:60,  unitPrice:22.50, weight:5.0,  supplier:'WeldPro Supply',    lastRestocked:'2026-08-02', status:'active' },
    { id:'PRD-017', sku:'HRD-ACR-10X10', name:'10mm Acrylic Sheet 1mx1m',        category:'Hardware',    zone:'B', bin:'B-04-01', quantity:7,   reorderPoint:3,  maxCapacity:20,  unitPrice:48.00, weight:12.0, supplier:'PlastiCraft',       lastRestocked:'2026-07-15', status:'active' },
    { id:'PRD-018', sku:'HRD-SCR-PH2-50',name:'PH2 Wood Screw 50mm (pk/100)',    category:'Hardware',    zone:'B', bin:'B-04-03', quantity:800, reorderPoint:200,maxCapacity:1500,unitPrice:5.20,  weight:0.5,  supplier:'MetalWorks Inc',    lastRestocked:'2026-08-08', status:'active' },
    { id:'PRD-019', sku:'HRD-HSW-6MM',   name:'6mm Steel Hex Socket Wrench Set', category:'Hardware',    zone:'B', bin:'B-05-02', quantity:42,  reorderPoint:12, maxCapacity:80,  unitPrice:35.00, weight:0.8,  supplier:'ToolMaster Pro',    lastRestocked:'2026-08-04', status:'active' },
    { id:'PRD-020', sku:'HRD-ANR-5MM',   name:'5mm Aluminum Angle Rail 2m',      category:'Hardware',    zone:'B', bin:'B-05-04', quantity:60,  reorderPoint:15, maxCapacity:120, unitPrice:18.00, weight:2.5,  supplier:'MetalWorks Inc',    lastRestocked:'2026-08-06', status:'active' },
    // Zone C — Packaging
    { id:'PRD-021', sku:'PKG-BOX-A4-10', name:'A4 Single-Wall Box (pk/25)',       category:'Packaging',   zone:'C', bin:'C-01-01', quantity:180, reorderPoint:50, maxCapacity:400, unitPrice:18.00, weight:3.5,  supplier:'PackCo',            lastRestocked:'2026-08-10', status:'active' },
    { id:'PRD-022', sku:'PKG-BUB-50M',   name:'Bubble Wrap 50m Roll',             category:'Packaging',   zone:'C', bin:'C-01-04', quantity:22,  reorderPoint:8,  maxCapacity:60,  unitPrice:32.00, weight:4.0,  supplier:'PackCo',            lastRestocked:'2026-08-01', status:'active' },
    { id:'PRD-023', sku:'PKG-TAPE-48MM', name:'48mm Clear Packing Tape (pk/6)',   category:'Packaging',   zone:'C', bin:'C-02-02', quantity:145, reorderPoint:40, maxCapacity:300, unitPrice:14.50, weight:1.8,  supplier:'TapeMax',           lastRestocked:'2026-08-09', status:'active' },
    { id:'PRD-024', sku:'PKG-FOAM-25MM', name:'25mm Foam Padding Sheets (pk/20)', category:'Packaging',   zone:'C', bin:'C-02-05', quantity:38,  reorderPoint:12, maxCapacity:80,  unitPrice:28.00, weight:2.2,  supplier:'FoamTech',          lastRestocked:'2026-07-29', status:'active' },
    { id:'PRD-025', sku:'PKG-LBL-A4-SH', name:'A4 Shipping Labels 100pk',        category:'Packaging',   zone:'C', bin:'C-03-03', quantity:62,  reorderPoint:20, maxCapacity:150, unitPrice:9.50,  weight:0.6,  supplier:'LabelPro',          lastRestocked:'2026-08-05', status:'active' },
    { id:'PRD-026', sku:'PKG-STR-BAND',  name:'Steel Strapping Band 16mm×200m',  category:'Packaging',   zone:'C', bin:'C-04-01', quantity:8,   reorderPoint:4,  maxCapacity:20,  unitPrice:55.00, weight:10.0, supplier:'StrapTech',         lastRestocked:'2026-07-18', status:'active' },
    { id:'PRD-027', sku:'PKG-VOI-FILL',  name:'Void Fill Paper 500m Roll',        category:'Packaging',   zone:'C', bin:'C-04-04', quantity:14,  reorderPoint:6,  maxCapacity:30,  unitPrice:45.00, weight:6.5,  supplier:'PackCo',            lastRestocked:'2026-07-22', status:'active' },
    { id:'PRD-028', sku:'PKG-PLT-12STD', name:'Standard Wooden Pallet (ea)',      category:'Packaging',   zone:'C', bin:'C-05-02', quantity:35,  reorderPoint:10, maxCapacity:80,  unitPrice:18.00, weight:20.0, supplier:'WoodCraft Supply',  lastRestocked:'2026-08-03', status:'active' },
    // Zone D — Safety
    { id:'PRD-029', sku:'SAF-HLM-WHT-L', name:'Hard Hat White Large',             category:'Safety',      zone:'D', bin:'D-01-02', quantity:45,  reorderPoint:15, maxCapacity:100, unitPrice:22.00, weight:0.45, supplier:'SafeFirst Inc',     lastRestocked:'2026-08-08', status:'active' },
    { id:'PRD-030', sku:'SAF-GLV-NTL-M', name:'Nitrile Gloves Medium (pk/100)',   category:'Safety',      zone:'D', bin:'D-01-04', quantity:8,   reorderPoint:20, maxCapacity:80,  unitPrice:14.00, weight:0.5,  supplier:'SafeFirst Inc',     lastRestocked:'2026-07-20', status:'active' },
    { id:'PRD-031', sku:'SAF-VST-HV-L',  name:'Hi-Vis Safety Vest Large',         category:'Safety',      zone:'D', bin:'D-02-01', quantity:32,  reorderPoint:10, maxCapacity:60,  unitPrice:9.50,  weight:0.2,  supplier:'VisibilityGear',    lastRestocked:'2026-08-06', status:'active' },
    { id:'PRD-032', sku:'SAF-EAR-3M',    name:'3M Earplugs 100pk',                category:'Safety',      zone:'D', bin:'D-02-03', quantity:24,  reorderPoint:8,  maxCapacity:60,  unitPrice:18.00, weight:0.3,  supplier:'3M Authorized',     lastRestocked:'2026-08-02', status:'active' },
    { id:'PRD-033', sku:'SAF-BOOT-S11',  name:'Steel-Toe Safety Boot Size 11',    category:'Safety',      zone:'D', bin:'D-03-01', quantity:6,   reorderPoint:3,  maxCapacity:20,  unitPrice:88.00, weight:1.8,  supplier:'SafeFirst Inc',     lastRestocked:'2026-07-12', status:'active' },
    { id:'PRD-034', sku:'SAF-FST-AID-A', name:'First Aid Kit Type A',             category:'Safety',      zone:'D', bin:'D-03-04', quantity:12,  reorderPoint:4,  maxCapacity:30,  unitPrice:35.00, weight:0.8,  supplier:'MedSupply',         lastRestocked:'2026-08-01', status:'active' },
    { id:'PRD-035', sku:'SAF-SIGN-CAUTION',name:'Caution Wet Floor Sign',         category:'Safety',      zone:'D', bin:'D-04-02', quantity:18,  reorderPoint:5,  maxCapacity:40,  unitPrice:12.00, weight:0.5,  supplier:'SafeSignage',       lastRestocked:'2026-08-04', status:'active' },
    { id:'PRD-036', sku:'SAF-EYE-CLR-M', name:'Clear Safety Goggles Medium',      category:'Safety',      zone:'D', bin:'D-04-05', quantity:41,  reorderPoint:12, maxCapacity:80,  unitPrice:7.50,  weight:0.15, supplier:'SafeFirst Inc',     lastRestocked:'2026-08-07', status:'active' },
    // Zone E — Office
    { id:'PRD-037', sku:'OFF-PPR-A4-REM', name:'A4 Copy Paper 500 Sheets Ream',   category:'Office',      zone:'E', bin:'E-01-01', quantity:95,  reorderPoint:30, maxCapacity:200, unitPrice:7.80,  weight:2.4,  supplier:'OfficePro',         lastRestocked:'2026-08-09', status:'active' },
    { id:'PRD-038', sku:'OFF-INK-BK-XL',  name:'Black Ink Cartridge XL',          category:'Office',      zone:'E', bin:'E-01-03', quantity:28,  reorderPoint:10, maxCapacity:60,  unitPrice:21.00, weight:0.12, supplier:'PrintSupply',       lastRestocked:'2026-08-05', status:'active' },
    { id:'PRD-039', sku:'OFF-BND-A4-50',  name:'A4 Ring Binder 50mm Spine',       category:'Office',      zone:'E', bin:'E-02-02', quantity:55,  reorderPoint:15, maxCapacity:120, unitPrice:4.20,  weight:0.45, supplier:'OfficePro',         lastRestocked:'2026-08-03', status:'active' },
    { id:'PRD-040', sku:'OFF-MRK-WBT-8',  name:'Whiteboard Marker Set 8 Color',   category:'Office',      zone:'E', bin:'E-02-04', quantity:33,  reorderPoint:10, maxCapacity:80,  unitPrice:8.00,  weight:0.1,  supplier:'ArtSupply',         lastRestocked:'2026-08-07', status:'active' },
    { id:'PRD-041', sku:'OFF-PSN-NOTES',  name:'Sticky Notes Pad 76×76mm 6pk',    category:'Office',      zone:'E', bin:'E-03-01', quantity:110, reorderPoint:30, maxCapacity:250, unitPrice:5.50,  weight:0.2,  supplier:'OfficePro',         lastRestocked:'2026-08-10', status:'active' },
    { id:'PRD-042', sku:'OFF-CBL-TIES-50',name:'Nylon Cable Ties 200mm (pk/50)',   category:'Office',      zone:'E', bin:'E-03-03', quantity:74,  reorderPoint:20, maxCapacity:150, unitPrice:3.50,  weight:0.15, supplier:'CableWorks',        lastRestocked:'2026-08-08', status:'active' },
    { id:'PRD-043', sku:'OFF-SHP-TAPE',   name:'Scotch Magic Tape 24mm×33m 6pk',  category:'Office',      zone:'E', bin:'E-04-02', quantity:48,  reorderPoint:15, maxCapacity:100, unitPrice:9.00,  weight:0.4,  supplier:'TapeMax',           lastRestocked:'2026-08-06', status:'active' },
    // Zone F — Machinery Parts
    { id:'PRD-044', sku:'MCP-BRG-6205',   name:'Deep Groove Ball Bearing 6205',   category:'Machinery',   zone:'F', bin:'F-01-02', quantity:55,  reorderPoint:15, maxCapacity:120, unitPrice:8.50,  weight:0.12, supplier:'BearingPro',        lastRestocked:'2026-08-05', status:'active' },
    { id:'PRD-045', sku:'MCP-SLN-5MM',    name:'5mm Precision Solenoid Valve',    category:'Machinery',   zone:'F', bin:'F-01-05', quantity:18,  reorderPoint:6,  maxCapacity:40,  unitPrice:45.00, weight:0.3,  supplier:'PneumaticParts',    lastRestocked:'2026-08-01', status:'active' },
    { id:'PRD-046', sku:'MCP-GSK-VITON',  name:'Viton O-Ring Gasket Assortment',  category:'Machinery',   zone:'F', bin:'F-02-02', quantity:9,   reorderPoint:5,  maxCapacity:30,  unitPrice:22.00, weight:0.2,  supplier:'SealTech',          lastRestocked:'2026-07-28', status:'active' },
    { id:'PRD-047', sku:'MCP-VBL-6206',   name:'6206 Sealed Bearing 2RS',         category:'Machinery',   zone:'F', bin:'F-02-04', quantity:38,  reorderPoint:10, maxCapacity:80,  unitPrice:12.00, weight:0.19, supplier:'BearingPro',        lastRestocked:'2026-08-03', status:'active' },
    { id:'PRD-048', sku:'MCP-GR-NIPL-10', name:'10mm Grease Nipple Zerk (pk/20)', category:'Machinery',   zone:'F', bin:'F-03-01', quantity:120, reorderPoint:30, maxCapacity:200, unitPrice:6.00,  weight:0.25, supplier:'LubeTech',          lastRestocked:'2026-08-08', status:'active' },
    { id:'PRD-049', sku:'MCP-SHF-20SS',   name:'20mm SS Shaft Coupler Flexible',  category:'Machinery',   zone:'F', bin:'F-03-03', quantity:22,  reorderPoint:8,  maxCapacity:50,  unitPrice:18.50, weight:0.25, supplier:'PrecisionParts',    lastRestocked:'2026-07-31', status:'active' },
    { id:'PRD-050', sku:'MCP-PMP-GEAR-12',name:'12V Gear Pump 1.2L/min',          category:'Machinery',   zone:'F', bin:'F-04-02', quantity:4,   reorderPoint:3,  maxCapacity:15,  unitPrice:62.00, weight:0.65, supplier:'PneumaticParts',    lastRestocked:'2026-07-10', status:'active' },
  ];

  // Stock movement history
  const movements = [
    { id:'MOV-001', productId:'PRD-001', type:'in',  quantity:50,  note:'Supplier delivery', date:'2026-08-10', by:'System' },
    { id:'MOV-002', productId:'PRD-003', type:'out', quantity:8,   note:'Order ORD-014 allocated', date:'2026-08-13', by:'System' },
    { id:'MOV-003', productId:'PRD-007', type:'out', quantity:22,  note:'Order ORD-009 fulfilled', date:'2026-08-12', by:'ST-001' },
    { id:'MOV-004', productId:'PRD-030', type:'adj', quantity:-3,  note:'Damaged — Incident INC-001', date:'2026-08-11', by:'ST-004' },
    { id:'MOV-005', productId:'PRD-006', type:'in',  quantity:80,  note:'Supplier delivery', date:'2026-08-12', by:'System' },
    { id:'MOV-006', productId:'PRD-021', type:'out', quantity:40,  note:'Order ORD-007 fulfilled', date:'2026-08-13', by:'ST-002' },
    { id:'MOV-007', productId:'PRD-033', type:'out', quantity:2,   note:'Order ORD-022 allocated', date:'2026-08-13', by:'System' },
    { id:'MOV-008', productId:'PRD-046', type:'adj', quantity:-2,  note:'Missing — Incident INC-002', date:'2026-08-12', by:'ST-005' },
    { id:'MOV-009', productId:'PRD-008', type:'in',  quantity:5,   note:'Emergency restock', date:'2026-08-11', by:'System' },
    { id:'MOV-010', productId:'PRD-050', type:'out', quantity:2,   note:'Order ORD-018 fulfilled', date:'2026-08-10', by:'ST-006' },
  ];

  // Generate orders
  const customers = [
    { id:'CST-001', name:'Apex Distributors',    tier:'VIP',      address:'12 Industrial Blvd, Chicago IL 60601' },
    { id:'CST-002', name:'Meridian Electronics', tier:'Premium',  address:'88 Tech Park, Austin TX 78701' },
    { id:'CST-003', name:'BuildRight Co.',        tier:'Standard', address:'45 Commerce St, Denver CO 80202' },
    { id:'CST-004', name:'SafeGuard Supply',      tier:'VIP',      address:'200 Safety Lane, Atlanta GA 30301' },
    { id:'CST-005', name:'OfficeNow Inc.',        tier:'Standard', address:'33 Business Ave, Seattle WA 98101' },
    { id:'CST-006', name:'Precision Parts Ltd',   tier:'Premium',  address:'7 Factory Road, Detroit MI 48201' },
    { id:'CST-007', name:'PackRight Solutions',   tier:'Premium',  address:'91 Logistics Way, Dallas TX 75201' },
    { id:'CST-008', name:'GreenTech Industries',  tier:'VIP',      address:'15 Innovation Dr, Boston MA 02101' },
  ];

  const tierPriorityMap = { VIP: 'vip', Premium: 'express', Standard: 'standard' };

  function daysFromNow(n) {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString();
  }

  function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString();
  }

  function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  const orders = [
    {
      id: 'ORD-001', customerId:'CST-001', customerName:'Apex Distributors', customerTier:'VIP',
      priority:'vip', status:'pending',
      items:[
        { productId:'PRD-004', sku:'ELC-MOD-ESP32', name:'ESP32 WiFi+BT Module', quantity:10, allocated:0 },
        { productId:'PRD-006', sku:'ELC-BAT-18650', name:'18650 Li-Ion Battery 3000mAh', quantity:50, allocated:0 },
        { productId:'PRD-009', sku:'ELC-CAB-USB3M', name:'USB-C to USB-A Cable 3m', quantity:20, allocated:0 },
      ],
      createdAt: daysAgo(1), dueDate: daysFromNow(1), notes:'Rush order — priority client',
      customerId_ref:'CST-001', carrier:null, trackingId:null, dispatchedAt:null
    },
    {
      id: 'ORD-002', customerId:'CST-002', customerName:'Meridian Electronics', customerTier:'Premium',
      priority:'express', status:'allocated',
      items:[
        { productId:'PRD-001', sku:'ELC-MCU-328', name:'Arduino Mega Microcontroller', quantity:5, allocated:5 },
        { productId:'PRD-010', sku:'ELC-PCB-PROTO', name:'Double-Side PCB Prototyping Board', quantity:20, allocated:20 },
      ],
      createdAt: daysAgo(2), dueDate: daysFromNow(1), notes:'',
      carrier:null, trackingId:null, dispatchedAt:null
    },
    {
      id: 'ORD-003', customerId:'CST-003', customerName:'BuildRight Co.', customerTier:'Standard',
      priority:'standard', status:'picking',
      items:[
        { productId:'PRD-011', sku:'HRD-BLT-M8x40', name:'M8×40mm Hex Bolt (pk/50)', quantity:8, allocated:8 },
        { productId:'PRD-012', sku:'HRD-NUT-M8', name:'M8 Hex Nut (pk/100)', quantity:8, allocated:8 },
        { productId:'PRD-018', sku:'HRD-SCR-PH2-50', name:'PH2 Wood Screw 50mm (pk/100)', quantity:5, allocated:5 },
      ],
      createdAt: daysAgo(3), dueDate: daysFromNow(2), notes:'Include packing list',
      carrier:null, trackingId:null, dispatchedAt:null
    },
    {
      id: 'ORD-004', customerId:'CST-004', customerName:'SafeGuard Supply', customerTier:'VIP',
      priority:'vip', status:'packed',
      items:[
        { productId:'PRD-029', sku:'SAF-HLM-WHT-L', name:'Hard Hat White Large', quantity:10, allocated:10 },
        { productId:'PRD-031', sku:'SAF-VST-HV-L', name:'Hi-Vis Safety Vest Large', quantity:15, allocated:15 },
        { productId:'PRD-036', sku:'SAF-EYE-CLR-M', name:'Clear Safety Goggles Medium', quantity:20, allocated:20 },
      ],
      createdAt: daysAgo(4), dueDate: daysFromNow(0), notes:'Annual restocking order',
      carrier:'FedEx', trackingId:null, dispatchedAt:null
    },
    {
      id: 'ORD-005', customerId:'CST-005', customerName:'OfficeNow Inc.', customerTier:'Standard',
      priority:'standard', status:'dispatched',
      items:[
        { productId:'PRD-037', sku:'OFF-PPR-A4-REM', name:'A4 Copy Paper 500 Sheets Ream', quantity:10, allocated:10 },
        { productId:'PRD-038', sku:'OFF-INK-BK-XL', name:'Black Ink Cartridge XL', quantity:6, allocated:6 },
        { productId:'PRD-041', sku:'OFF-PSN-NOTES', name:'Sticky Notes Pad 76×76mm 6pk', quantity:12, allocated:12 },
      ],
      createdAt: daysAgo(5), dueDate: daysAgo(1), notes:'',
      carrier:'UPS', trackingId:'1Z-UPS-789456123', dispatchedAt: daysAgo(1)
    },
    {
      id: 'ORD-006', customerId:'CST-006', customerName:'Precision Parts Ltd', customerTier:'Premium',
      priority:'express', status:'delivered',
      items:[
        { productId:'PRD-044', sku:'MCP-BRG-6205', name:'Deep Groove Ball Bearing 6205', quantity:12, allocated:12 },
        { productId:'PRD-047', sku:'MCP-VBL-6206', name:'6206 Sealed Bearing 2RS', quantity:8, allocated:8 },
        { productId:'PRD-049', sku:'MCP-SHF-20SS', name:'20mm SS Shaft Coupler Flexible', quantity:4, allocated:4 },
      ],
      createdAt: daysAgo(7), dueDate: daysAgo(3), notes:'',
      carrier:'DHL', trackingId:'DHL-112233445566', dispatchedAt: daysAgo(4)
    },
    {
      id: 'ORD-007', customerId:'CST-007', customerName:'PackRight Solutions', customerTier:'Premium',
      priority:'express', status:'dispatched',
      items:[
        { productId:'PRD-021', sku:'PKG-BOX-A4-10', name:'A4 Single-Wall Box (pk/25)', quantity:8, allocated:8 },
        { productId:'PRD-022', sku:'PKG-BUB-50M', name:'Bubble Wrap 50m Roll', quantity:5, allocated:5 },
        { productId:'PRD-023', sku:'PKG-TAPE-48MM', name:'48mm Clear Packing Tape (pk/6)', quantity:10, allocated:10 },
      ],
      createdAt: daysAgo(3), dueDate: daysAgo(0), notes:'',
      carrier:'FedEx', trackingId:'FX-556677889900', dispatchedAt: daysAgo(0)
    },
    {
      id: 'ORD-008', customerId:'CST-008', customerName:'GreenTech Industries', customerTier:'VIP',
      priority:'vip', status:'pending',
      items:[
        { productId:'PRD-005', sku:'ELC-LED-RGB5K', name:'RGB LED Strip 5m IP65', quantity:15, allocated:0 },
        { productId:'PRD-004', sku:'ELC-MOD-ESP32', name:'ESP32 WiFi+BT Module', quantity:20, allocated:0 },
        { productId:'PRD-002', sku:'ELC-CAP-470U', name:'470µF Electrolytic Capacitor (pk/100)', quantity:5, allocated:0 },
      ],
      createdAt: daysAgo(0), dueDate: daysFromNow(3), notes:'Prototype batch',
      carrier:null, trackingId:null, dispatchedAt:null
    },
    {
      id: 'ORD-009', customerId:'CST-003', customerName:'BuildRight Co.', customerTier:'Standard',
      priority:'standard', status:'pending',
      items:[
        { productId:'PRD-013', sku:'HRD-DRL-10MM', name:'10mm Tungsten Carbide Drill Bit', quantity:5, allocated:0 },
        { productId:'PRD-015', sku:'HRD-TAP-SET', name:'M3-M12 Tap & Die Set', quantity:2, allocated:0 },
        { productId:'PRD-019', sku:'HRD-HSW-6MM', name:'6mm Steel Hex Socket Wrench Set', quantity:3, allocated:0 },
      ],
      createdAt: daysAgo(0), dueDate: daysFromNow(5), notes:'',
      carrier:null, trackingId:null, dispatchedAt:null
    },
    {
      id: 'ORD-010', customerId:'CST-001', customerName:'Apex Distributors', customerTier:'VIP',
      priority:'vip', status:'allocated',
      items:[
        { productId:'PRD-044', sku:'MCP-BRG-6205', name:'Deep Groove Ball Bearing 6205', quantity:20, allocated:20 },
        { productId:'PRD-048', sku:'MCP-GR-NIPL-10', name:'10mm Grease Nipple Zerk (pk/20)', quantity:10, allocated:10 },
        { productId:'PRD-045', sku:'MCP-SLN-5MM', name:'5mm Precision Solenoid Valve', quantity:4, allocated:4 },
      ],
      createdAt: daysAgo(1), dueDate: daysFromNow(2), notes:'Maintenance batch',
      carrier:null, trackingId:null, dispatchedAt:null
    },
    {
      id: 'ORD-011', customerId:'CST-004', customerName:'SafeGuard Supply', customerTier:'VIP',
      priority:'vip', status:'pending',
      items:[
        { productId:'PRD-030', sku:'SAF-GLV-NTL-M', name:'Nitrile Gloves Medium (pk/100)', quantity:5, allocated:0 },
        { productId:'PRD-034', sku:'SAF-FST-AID-A', name:'First Aid Kit Type A', quantity:3, allocated:0 },
      ],
      createdAt: daysAgo(0), dueDate: daysFromNow(1), notes:'Urgent — low stock at client site',
      carrier:null, trackingId:null, dispatchedAt:null
    },
    {
      id: 'ORD-012', customerId:'CST-002', customerName:'Meridian Electronics', customerTier:'Premium',
      priority:'express', status:'picking',
      items:[
        { productId:'PRD-008', sku:'ELC-PWR-24V5A', name:'24V 5A Switching Power Supply', quantity:4, allocated:4 },
        { productId:'PRD-007', sku:'ELC-RLY-5VDC', name:'5V DC Relay Module 10A', quantity:8, allocated:0 },
      ],
      createdAt: daysAgo(2), dueDate: daysFromNow(1), notes:'Partial: relay out of stock',
      carrier:null, trackingId:null, dispatchedAt:null
    },
  ];

  // Pick tasks
  const pickTasks = [
    {
      id:'PCK-001', orderId:'ORD-003', assignedTo:'ST-001', status:'in_progress',
      items:[
        { productId:'PRD-011', sku:'HRD-BLT-M8x40', name:'M8×40mm Hex Bolt (pk/50)', zone:'B', bin:'B-01-01', quantity:8, picked:true },
        { productId:'PRD-012', sku:'HRD-NUT-M8',    name:'M8 Hex Nut (pk/100)',       zone:'B', bin:'B-01-03', quantity:8, picked:true },
        { productId:'PRD-018', sku:'HRD-SCR-PH2-50',name:'PH2 Wood Screw 50mm (pk/100)',zone:'B',bin:'B-04-03',quantity:5, picked:false },
      ],
      startedAt: new Date(Date.now()-1800000).toISOString(), completedAt:null
    },
    {
      id:'PCK-002', orderId:'ORD-002', assignedTo:'ST-003', status:'pending',
      items:[
        { productId:'PRD-001', sku:'ELC-MCU-328',   name:'Arduino Mega Microcontroller',     zone:'A', bin:'A-01-02', quantity:5, picked:false },
        { productId:'PRD-010', sku:'ELC-PCB-PROTO', name:'Double-Side PCB Prototyping Board',zone:'A', bin:'A-05-05', quantity:20, picked:false },
      ],
      startedAt:null, completedAt:null
    },
    {
      id:'PCK-003', orderId:'ORD-010', assignedTo:'ST-006', status:'pending',
      items:[
        { productId:'PRD-044', sku:'MCP-BRG-6205',  name:'Deep Groove Ball Bearing 6205',    zone:'F', bin:'F-01-02', quantity:20, picked:false },
        { productId:'PRD-048', sku:'MCP-GR-NIPL-10',name:'10mm Grease Nipple Zerk (pk/20)', zone:'F', bin:'F-03-01', quantity:10, picked:false },
        { productId:'PRD-045', sku:'MCP-SLN-5MM',   name:'5mm Precision Solenoid Valve',     zone:'F', bin:'F-01-05', quantity:4, picked:false },
      ],
      startedAt:null, completedAt:null
    },
  ];

  // Alerts
  const alerts = [
    { id:'ALT-001', type:'stockout',   severity:'critical', productId:'PRD-007', sku:'ELC-RLY-5VDC',  productName:'5V DC Relay Module 10A',        message:'Product out of stock',          quantity:0,  threshold:20, status:'open',         createdAt: daysAgo(2), acknowledgedBy:null, resolvedAt:null },
    { id:'ALT-002', type:'low_stock',  severity:'warning',  productId:'PRD-003', sku:'ELC-SEN-DHT22', productName:'DHT22 Temp/Humidity Sensor',     message:'Stock below reorder point',     quantity:12, threshold:15, status:'open',         createdAt: daysAgo(1), acknowledgedBy:null, resolvedAt:null },
    { id:'ALT-003', type:'low_stock',  severity:'warning',  productId:'PRD-030', sku:'SAF-GLV-NTL-M', productName:'Nitrile Gloves Medium (pk/100)', message:'Stock below reorder point',     quantity:8,  threshold:20, status:'acknowledged', createdAt: daysAgo(3), acknowledgedBy:'ST-001', resolvedAt:null },
    { id:'ALT-004', type:'damaged',    severity:'warning',  productId:'PRD-030', sku:'SAF-GLV-NTL-M', productName:'Nitrile Gloves Medium (pk/100)', message:'3 units found damaged in D-01-04',quantity:3, threshold:0, status:'open',         createdAt: daysAgo(3), acknowledgedBy:null, resolvedAt:null },
    { id:'ALT-005', type:'low_stock',  severity:'critical', productId:'PRD-050', sku:'MCP-PMP-GEAR-12',productName:'12V Gear Pump 1.2L/min',        message:'Stock critically low',          quantity:4,  threshold:3,  status:'open',         createdAt: daysAgo(0), acknowledgedBy:null, resolvedAt:null },
    { id:'ALT-006', type:'low_stock',  severity:'warning',  productId:'PRD-033', sku:'SAF-BOOT-S11',  productName:'Steel-Toe Safety Boot Size 11',  message:'Stock below reorder point',     quantity:6,  threshold:3,  status:'resolved',     createdAt: daysAgo(5), acknowledgedBy:'ST-004', resolvedAt: daysAgo(2) },
    { id:'ALT-007', type:'missing',    severity:'critical', productId:'PRD-046', sku:'MCP-GSK-VITON', productName:'Viton O-Ring Gasket Assortment',  message:'2 units missing from F-02-02', quantity:2,  threshold:0,  status:'open',         createdAt: daysAgo(1), acknowledgedBy:null, resolvedAt:null },
    { id:'ALT-008', type:'stockout',   severity:'critical', productId:'PRD-007', sku:'ELC-RLY-5VDC',  productName:'5V DC Relay Module 10A',          message:'Reorder triggered — lead time 5d',quantity:0,threshold:20,status:'acknowledged', createdAt: daysAgo(2), acknowledgedBy:'ST-001', resolvedAt:null },
  ];

  // Incidents
  const incidents = [
    { id:'INC-001', type:'damaged',  productId:'PRD-030', sku:'SAF-GLV-NTL-M', productName:'Nitrile Gloves Medium (pk/100)', quantity:3, zone:'D', bin:'D-01-04', description:'Found 3 packs with torn packaging during receiving inspection. Likely damaged in transit.', reportedBy:'ST-004', status:'reviewing', createdAt: daysAgo(3), resolvedAt:null, stockAdjusted:true },
    { id:'INC-002', type:'missing',  productId:'PRD-046', sku:'MCP-GSK-VITON', productName:'Viton O-Ring Gasket Assortment', quantity:2, zone:'F', bin:'F-02-02', description:'Cycle count shows 2 units missing. No record of movement in past 7 days.', reportedBy:'ST-005', status:'open', createdAt: daysAgo(1), resolvedAt:null, stockAdjusted:false },
    { id:'INC-003', type:'damaged',  productId:'PRD-017', sku:'HRD-ACR-10X10', productName:'10mm Acrylic Sheet 1mx1m', quantity:1, zone:'B', bin:'B-04-01', description:'One sheet cracked. Likely forklift contact.', reportedBy:'ST-002', status:'resolved', createdAt: daysAgo(8), resolvedAt: daysAgo(6), stockAdjusted:true },
  ];

  // Dispatch records
  const dispatches = [
    { id:'DSP-001', orderId:'ORD-005', carrier:'UPS',   trackingId:'1Z-UPS-789456123',   status:'in_transit',  scheduledDate: daysAgo(1), dispatchedAt: daysAgo(1), deliveredAt:null, labelPrinted:true },
    { id:'DSP-002', orderId:'ORD-006', carrier:'DHL',   trackingId:'DHL-112233445566',   status:'delivered',   scheduledDate: daysAgo(4), dispatchedAt: daysAgo(4), deliveredAt: daysAgo(1), labelPrinted:true },
    { id:'DSP-003', orderId:'ORD-007', carrier:'FedEx', trackingId:'FX-556677889900',    status:'in_transit',  scheduledDate: daysAgo(0), dispatchedAt: daysAgo(0), deliveredAt:null, labelPrinted:true },
  ];

  // Analytics: daily order counts (last 14 days)
  const dailyOrders = [4,7,5,8,6,9,11,7,8,6,10,8,12,9];
  const dailyFulfillment = [3,6,5,7,5,8,10,6,7,5,9,7,11,8];

  return { products, orders, staff, movements, alerts, incidents, pickTasks, dispatches,
           zoneInfo, zones, customers, dailyOrders, dailyFulfillment };
})();
