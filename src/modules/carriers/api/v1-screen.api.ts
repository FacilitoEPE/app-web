import { empresaTransporteExternoV1, vehiculoExternoV1, choferTransporteExternoV1 } from '@/modules/carriers/api/future.api';
import type { EmpresaTransporteExternoV1 } from '@/modules/carriers/api/future.dto';
import type { CarrierInput, VehicleInput, DriverInput } from '@/modules/carriers/api/carrier.api';
import type { Carrier, Vehicle, Driver } from '@/modules/carriers/carriers.data';
import type { CarrierExtras } from '@/modules/carriers/carrierProfile.utils';
import { operationsContext, readAllV1 } from '@/modules/operations/api/operations-context.api';
import { commitRemote } from '@/shared/api/data-contract';
export function mapCarrierV1(row: EmpresaTransporteExternoV1): Carrier {
    const g = operationsContext(), id = row.idEmpresaTransporteExterno;
    return { id, nombre: row.nombreCompleto, ruc: row.ruc ?? '', correo: row.correo ?? '', numero: row.numero,
        vehiculos: g.vehicles.filter(v => v.idEmpresaTransporteExterno === id).map(v => ({ id: v.idVehiculoExterno, carrierId: id, placa: v.placa, volumen: v.volumen ?? 0, ancho: v.ancho ?? 0, altura: v.altura ?? 0, profundidad: v.profundidad ?? 0, pesoNeto: v.pesoNeto ?? 0, pesoBruto: v.pesoBruto ?? 0 })),
        choferes: g.drivers.filter(d => d.idEmpresaTransporteExterno === id).map(d => ({ id: d.idChoferTransporteExterno, carrierId: id, nombre: d.nombre, telefono: d.telefono, correo: d.correo ?? '' })),
    };
}
const fields = (input: Partial<CarrierInput>, extras?: CarrierExtras) => ({ nombreCompleto: input.nombre, numero: input.numero, correo: input.correo || null, ruc: input.ruc || null, ...(extras ? { tipoTransportista: extras.tipo === 'privado' ? 'INDEPENDIENTE' as const : 'EMPRESA' as const, tipoDocumento: extras.tipo === 'privado' ? 'DNI' : null, numeroDocumento: extras.documento || null, registroMtc: extras.mtc || null, departamento: extras.departamento || null, provincia: extras.provincia || null, ciudad: extras.ciudad || null } : {}) });
export const carrierScreenV1 = {
    list: async () => (await readAllV1<EmpresaTransporteExternoV1>('/transportistas')).map(mapCarrierV1),
    get: async (id: number) => mapCarrierV1(await empresaTransporteExternoV1.get(id)),
    create: async (input: CarrierInput, extras?: CarrierExtras) => mapCarrierV1(await commitRemote(() => empresaTransporteExternoV1.create(fields(input, extras) as Parameters<typeof empresaTransporteExternoV1.create>[0]))),
    update: async (id: number, input: Partial<CarrierInput>, extras?: CarrierExtras) => mapCarrierV1(await commitRemote(() => empresaTransporteExternoV1.update(id, fields(input, extras)))),
    remove: (id: number) => commitRemote(() => empresaTransporteExternoV1.remove(id)),
    vehicle: async (id: number, input: VehicleInput, vehicleId?: number): Promise<Vehicle> => {
        const r = vehiculoExternoV1(id), row = await commitRemote(() => vehicleId ? r.update(vehicleId, input) : r.create(input));
        return { id: row.idVehiculoExterno, carrierId: id, ...input };
    },
    removeVehicle: (id: number) => { const row = operationsContext().vehicles.find(v => v.idVehiculoExterno === id); if (!row)
        throw new Error('Vehículo no encontrado.'); return commitRemote(() => vehiculoExternoV1(row.idEmpresaTransporteExterno).remove(id)); },
    driver: async (id: number, input: DriverInput, driverId?: number): Promise<Driver> => {
        const r = choferTransporteExternoV1(id), row = await commitRemote(() => driverId ? r.update(driverId, input) : r.create(input));
        return { id: row.idChoferTransporteExterno, carrierId: id, ...input };
    },
    updateDriver: (id: number, input: Partial<DriverInput>) => { const row = operationsContext().drivers.find(d => d.idChoferTransporteExterno === id); if (!row)
        throw new Error('Chofer no encontrado.'); return commitRemote(() => choferTransporteExternoV1(row.idEmpresaTransporteExterno).update(id, input)).then(d => ({ id: d.idChoferTransporteExterno, carrierId: d.idEmpresaTransporteExterno, nombre: d.nombre, telefono: d.telefono, correo: d.correo ?? '' })); },
    removeDriver: (id: number) => { const row = operationsContext().drivers.find(d => d.idChoferTransporteExterno === id); if (!row)
        throw new Error('Chofer no encontrado.'); return commitRemote(() => choferTransporteExternoV1(row.idEmpresaTransporteExterno).remove(id)); },
};
