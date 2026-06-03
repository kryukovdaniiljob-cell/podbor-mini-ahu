// Типы данных движка подбора КПВУ

export interface Dims {
  W?: number | string; W1?: number | string; W2?: number | string; W3?: number | string;
  H?: number | string; H1?: number | string; H2?: number | string; H3?: number | string; H4?: number | string;
  L?: number | string; L1?: number | string; L2?: number | string; L3?: number | string; L4?: number | string;
  D?: number | string; d?: number | string;
  weight_kg?: number | string;
}

export interface SizeData {
  size_no: number;
  name: string;
  filter_supply?: string;
  filter_exhaust?: string;
  voltage_heater?: string;
  heater_power_kW: number;
  voltage_fan?: string;
  current_A?: number;
  power_kW?: number;
  rpm?: number;
  score_O: number;
  fan_a: number;
  fan_b: number;
  fan_c: number;
  fan_d: number;
  dims: Dims;
  recup_eff_T?: number;
  recup_eff_H?: number;
  preheat_CM?: number;
  accessories?: Record<string, string | number>;
  [k: string]: unknown;
}

export interface ModelData {
  type: 'supply' | 'supply_exhaust';
  descriptor_AN3?: string;
  descriptor_AN4?: string;
  descriptor_AN5?: string;
  heater_type_AN6?: string;
  n_sizes: number;
  sizes: SizeData[];
}

export interface AirPropCoeffs {
  sat_pressure_below0_kPa: { a: number; b: number; c: number; d: number; e: number };
  sat_pressure_above0_kPa: { a: number; b: number; c: number; d: number };
}

export interface MstUnit {
  no: number;
  mark: string;
  Kvs: number;
  a: number;
  b: number;
  c: number;
}

export interface ModelsDatabase {
  models: Record<string, ModelData>;
  air_properties: AirPropCoeffs;
  mst_units: MstUnit[];
}

// ---- Входные параметры ----
export type InstallationType = 'приточная' | 'приточно-вытяжная';
export type SelectionMode = 'автоматический' | 'вручную';
export type HeaterType = 'водяной' | 'электрический' | 'без нагревателя';
export type RecupType = 'роторный' | 'пластинчатый';
export type CaseType = 'изолированный' | 'не изолированный';
export type Automation = 'встроенная' | 'внешняя';
export type MotorType = 'ЕС' | 'асинхронный';
export type WallThickness = 'уменьшенная' | 'стандартная';
export type AirOutlet = 'вверх' | 'вбок';
export type Mounting = 'подвесная' | 'напольная';

export interface SelectorInput {
  installation_type: InstallationType;
  selection_mode: SelectionMode;
  manual_model_supply?: string;
  manual_model_se?: string;
  manual_size_no?: number;

  flow: number;          // расход, м³/ч
  head: number;          // напор, Па
  t_outdoor: number;     // t наружного
  rh_outdoor: number;    // φ наружного, %
  t_supply: number;      // t приточного

  t_indoor?: number;     // t внутреннего (П-В)
  rh_indoor?: number;    // φ внутреннего, % (П-В)

  heater_type: HeaterType;
  t_water_in?: number;
  t_water_out?: number;

  recup_type?: RecupType;

  case_type?: CaseType;
  automation?: Automation;
  motor_type?: MotorType;
  wall_thickness?: WallThickness;
  air_outlet?: AirOutlet;
  mounting?: Mounting;
}

export interface ChartPoint { Q: number; fan?: number; sys?: number; }

export interface RecupResult {
  t_supply_in: number;     // t приток вход (наружный)
  t_supply_out: number;    // t приток после рекуператора (J33)
  rh_supply_in: number;
  d_supply_in: number;
  h_supply_in: number;
  t_exhaust_in: number;    // t вытяжка вход (внутренний)
  t_exhaust_out: number;   // t вытяжка после рекуператора
  rh_exhaust_in: number;
  eff_T_pct: number;       // эффективность по температуре, %
  eff_H_pct: number;       // эффективность по энтальпии, %
  preheat_kW: number;      // CM
}

export interface WaterResult {
  flow_water_m3h: number;
  dp_water_kPa: number;
  mst_mark: string;
  valve_authority: number;
}

export interface SelectorResult {
  ok: boolean;
  modelName: string;
  modelType: 'supply' | 'supply_exhaust';
  fullName: string;
  title: string;
  m60: SizeData | null;
  m61: SizeData | null;

  // аэродинамика
  k: number;
  Q_op: number;
  actual_flow: number;   // E25
  actual_head: number;   // E26
  chart: ChartPoint[];

  // психрометрия наружного воздуха
  psy_outdoor: { d: number; h: number };
  psy_indoor?: { d: number; h: number };

  // нагреватель
  required_heater_kW: number;  // R28
  nominal_heater_kW: number;   // R29
  t_after_heater: number;      // R31

  recup?: RecupResult;
  water?: WaterResult;

  warnings: string[];
  error: string | null;
}
