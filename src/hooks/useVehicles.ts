import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
// 🚩 FLAG: useToast from @/components/ui/use-toast (shadcn) → @/hooks/use-toast (RN shim)
import { useToast } from "@/hooks/use-toast";

export interface Vehicle {
  id?: string;
  name: string;
  make: string;
  model: string;
  year: string;
  isDefault: boolean;
  mileageRate: number;
  startYearMileage?: number;
  endYearMileage?: number;
}

export const useVehicles = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadVehicles();
    } else {
      setVehicles([]);
      setLoading(false);
    }
  }, [user]);

  const loadVehicles = async () => {
    if (!user) return;

    try {
      const currentYear = new Date().getFullYear();

      const [vehiclesResult, shiftsResult] = await Promise.all([
        supabase
          .from('user_vehicles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('shift_summaries')
          .select('summary_data, end_time')
          .eq('user_id', user.id)
          .gte('end_time', `${currentYear}-01-01T00:00:00Z`)
          .lte('end_time', `${currentYear}-12-31T23:59:59Z`)
          .not('summary_data', 'is', null)
          .order('end_time', { ascending: false }),
      ]);

      if (vehiclesResult.error) {
        console.error("Error loading vehicles:", vehiclesResult.error);
        return;
      }

      // Build map of vehicleId -> most recent mileageEnd from completed shifts this year
      const latestMileageEndByVehicle: Record<string, number> = {};
      if (shiftsResult.data) {
        for (const row of shiftsResult.data) {
          try {
            const shift = typeof row.summary_data === 'string'
              ? JSON.parse(row.summary_data).shift
              : row.summary_data?.shift;
            const vehicleId: string | undefined = shift?.vehicleId;
            const mileageEnd: number | null | undefined = shift?.mileageEnd;
            if (vehicleId && mileageEnd != null && !(vehicleId in latestMileageEndByVehicle)) {
              latestMileageEndByVehicle[vehicleId] = mileageEnd;
            }
          } catch {
            // skip malformed rows
          }
        }
      }

      const mappedVehicles: Vehicle[] = vehiclesResult.data.map(vehicle => ({
        id: vehicle.id,
        name: vehicle.name,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        isDefault: vehicle.is_default,
        mileageRate: vehicle.mileage_rate,
        startYearMileage: vehicle.start_year_mileage,
        endYearMileage: vehicle.id && latestMileageEndByVehicle[vehicle.id] != null
          ? latestMileageEndByVehicle[vehicle.id]
          : vehicle.end_year_mileage,
      }));

      setVehicles(mappedVehicles);
    } catch (error) {
      console.error("Exception loading vehicles:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveVehicle = async (vehicle: Vehicle) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please log in to save vehicles.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const vehicleData = {
        user_id: user.id,
        name: vehicle.name,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        is_default: vehicle.isDefault,
        mileage_rate: vehicle.mileageRate,
        start_year_mileage: vehicle.startYearMileage,
        end_year_mileage: vehicle.endYearMileage,
      };

      if (vehicle.id) {
        const { error } = await supabase
          .from('user_vehicles')
          .update(vehicleData)
          .eq('id', vehicle.id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('user_vehicles')
          .insert(vehicleData)
          .select()
          .single();
        if (error) throw error;
        vehicle.id = data.id;
      }

      // If this vehicle is marked as default, update other vehicles
      if (vehicle.isDefault) {
        await supabase
          .from('user_vehicles')
          .update({ is_default: false })
          .eq('user_id', user.id)
          .neq('id', vehicle.id);
      }

      await loadVehicles();
      toast({
        title: "Vehicle saved",
        description: "Your vehicle has been saved successfully.",
      });
      return true;
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast({
        title: "Error saving vehicle",
        description: "There was a problem saving your vehicle.",
        variant: "destructive",
      });
      return false;
    }
  };

  const deleteVehicle = async (vehicleId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('user_vehicles')
        .delete()
        .eq('id', vehicleId);
      if (error) throw error;

      await loadVehicles();
      toast({
        title: "Vehicle deleted",
        description: "The vehicle has been removed from your list.",
      });
      return true;
    } catch (error) {
      console.error("Error deleting vehicle:", error);
      toast({
        title: "Error deleting vehicle",
        description: "There was a problem deleting your vehicle.",
        variant: "destructive",
      });
      return false;
    }
  };

  const setDefaultVehicle = async (vehicleId: string) => {
    if (!user) return false;

    try {
      await supabase
        .from('user_vehicles')
        .update({ is_default: false })
        .eq('user_id', user.id);

      const { error } = await supabase
        .from('user_vehicles')
        .update({ is_default: true })
        .eq('id', vehicleId);
      if (error) throw error;

      await loadVehicles();
      toast({
        title: "Default vehicle updated",
        description: "Your default vehicle has been updated.",
      });
      return true;
    } catch (error) {
      console.error("Error setting default vehicle:", error);
      toast({
        title: "Error updating default vehicle",
        description: "There was a problem updating your default vehicle.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    vehicles,
    loading,
    saveVehicle,
    deleteVehicle,
    setDefaultVehicle,
  };
};
