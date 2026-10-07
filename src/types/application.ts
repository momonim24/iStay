export type ApplicationStatus = "pending" | "approved" | "rejected";

export type RentalApplication = {
  id: string;
  tenant_id: string;
  property_id: string;
  room_id: string | null;
  message: string | null;
  status: ApplicationStatus;
  created_at: string;
  updated_at: string;
};

export type ApplicationProperty = {
  id: string;
  owner_id: string;
  name: string;
  address: string;
  barangay: string | null;
  city: string;
  province: string;
  property_type: string;
  monthly_rent: number;
  image: string | null;
};
export type ApplicationRoom = {
  id: string;
  property_id: string;
  name: string;
  monthly_rent: number;
};
export type ApplicationDetails = RentalApplication & {
  property: ApplicationProperty | null;
  room: ApplicationRoom | null;
  tenantName: string | null;
};
