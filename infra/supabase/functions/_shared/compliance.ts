// deno-lint-ignore-file no-explicit-any

export async function driverDocumentsAreCompliant(serviceClient: any, driverId: string): Promise<boolean> {
  const { data, error } = await serviceClient.rpc('driver_documents_compliant', {
    p_driver_id: driverId,
  });
  if (error) throw new Error(`Could not check driver documents: ${error.message}`);
  return data === true;
}

export async function vehicleDocumentsAreCompliant(serviceClient: any, vehicleId: string): Promise<boolean> {
  const { data, error } = await serviceClient.rpc('vehicle_documents_compliant', {
    p_vehicle_id: vehicleId,
  });
  if (error) throw new Error(`Could not check vehicle documents: ${error.message}`);
  return data === true;
}