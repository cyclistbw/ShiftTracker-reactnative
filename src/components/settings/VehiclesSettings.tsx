// 🚩 FLAG: lucide-react → lucide-react-native
// 🚩 FLAG: Dialog → Modal with TouchableWithoutFeedback overlay
// 🚩 FLAG: <div>/<p>/<span> → <View>/<Text>
// 🚩 FLAG: <input type="checkbox"> → Switch component
// 🚩 FLAG: e.target.value → onChangeText; type="number" → keyboardType="numeric"
// 🚩 FLAG: onClick → onPress
// 🚩 FLAG: inline SVG car icon → lucide-react-native Car icon
import { useState } from "react";
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Trash2, Pencil, Car } from "lucide-react-native";
import { useVehicles, Vehicle } from "@/hooks/useVehicles";
import { useAuth } from "@/context/AuthContext";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";

// IRS standard mileage rates by tax year
const IRS_MILEAGE_RATES: Record<string, number> = {
  '2020': 0.575,
  '2021': 0.56,
  '2022': 0.625,
  '2023': 0.655,
  '2024': 0.67,
  '2025': 0.70,
  '2026': 0.725,
};

const VehiclesSettings = () => {
  const { user } = useAuth();
  const { settings: businessSettings } = useBusinessSettings();
  const { vehicles, loading, saveVehicle, deleteVehicle, setDefaultVehicle } = useVehicles();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const currentYear = new Date().getFullYear();
  const taxYear = businessSettings?.currentTaxYear || currentYear.toString();
  const irsRate = IRS_MILEAGE_RATES[taxYear] ?? businessSettings?.defaultMileageRate ?? 0.725;

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <View className="items-center justify-center p-8">
            <Text className="text-sm text-muted-foreground">Loading vehicles...</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="pt-6">
          <View className="items-center justify-center p-8">
            <Text className="text-sm text-muted-foreground">Please log in to manage your vehicles.</Text>
          </View>
        </CardContent>
      </Card>
    );
  }

  const handleAddVehicle = () => {
    const newVehicle: Vehicle = {
      name: "",
      make: "",
      model: "",
      year: new Date().getFullYear().toString(),
      isDefault: vehicles.length === 0,
      mileageRate: irsRate,
    };
    setEditingVehicle(newVehicle);
    setIsVehicleDialogOpen(true);
  };

  const handleEditVehicle = (vehicle: Vehicle) => {
    setEditingVehicle({ ...vehicle });
    setIsVehicleDialogOpen(true);
  };

  const handleSaveVehicle = async () => {
    if (!editingVehicle) return;
    const success = await saveVehicle(editingVehicle);
    if (success) setIsVehicleDialogOpen(false);
  };

  const handleSetDefault = async (vehicleId: string) => {
    if (vehicleId) await setDefaultVehicle(vehicleId);
  };

  const handleDeleteVehicle = async (vehicleId: string) => {
    setIsDeleteDialogOpen(false);
    if (vehicleId) await deleteVehicle(vehicleId);
  };

  return (
    <>
      {/* Delete Confirmation Modal */}
      {/* 🚩 FLAG: Dialog → Modal */}
      <Modal
        visible={isDeleteDialogOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsDeleteDialogOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsDeleteDialogOpen(false)}>
          <View className="flex-1 bg-black/50 justify-center items-center px-4">
            <TouchableWithoutFeedback>
              <View className="bg-background rounded-lg border border-border w-full max-w-sm p-6">
                <Text className="text-lg font-semibold text-foreground mb-2">Delete Vehicle</Text>
                <Text className="text-foreground mb-6">
                  Are you sure you want to delete this vehicle? This action cannot be undone.
                </Text>
                <View className="flex-row justify-end gap-2">
                  <Button variant="outline" onPress={() => setIsDeleteDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onPress={() => editingVehicle?.id && handleDeleteVehicle(editingVehicle.id)}
                  >
                    Delete
                  </Button>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add/Edit Vehicle Modal */}
      {/* 🚩 FLAG: Dialog → Modal with KeyboardAvoidingView */}
      <Modal
        visible={isVehicleDialogOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsVehicleDialogOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsVehicleDialogOpen(false)}>
          <View className="flex-1 bg-black/50 justify-end">
            <TouchableWithoutFeedback>
              <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
              >
                <View className="bg-background rounded-t-2xl border-t border-border">
                  <View className="px-4 pt-4 pb-2 border-b border-border">
                    <Text className="text-lg font-semibold text-foreground">
                      {editingVehicle?.id ? 'Edit' : 'Add'} Vehicle
                    </Text>
                  </View>
                  <ScrollView className="max-h-[70vh] px-4" keyboardShouldPersistTaps="handled">
                    <View className="py-4 space-y-4">
                      {/* Vehicle Name */}
                      <View>
                        <Label className="mb-1">Vehicle Name</Label>
                        <Input
                          placeholder="e.g. My Car, Work Truck"
                          value={editingVehicle?.name || ''}
                          // 🚩 FLAG: onChange e.target.value → onChangeText
                          onChangeText={(text) => setEditingVehicle(prev => prev ? { ...prev, name: text } : null)}
                          className="mt-1"
                        />
                      </View>

                      {/* Make */}
                      <View>
                        <Label className="mb-1">Make</Label>
                        <Input
                          placeholder="e.g. Toyota, Ford"
                          value={editingVehicle?.make || ''}
                          onChangeText={(text) => setEditingVehicle(prev => prev ? { ...prev, make: text } : null)}
                          className="mt-1"
                        />
                      </View>

                      {/* Model */}
                      <View>
                        <Label className="mb-1">Model</Label>
                        <Input
                          placeholder="e.g. Camry, F-150"
                          value={editingVehicle?.model || ''}
                          onChangeText={(text) => setEditingVehicle(prev => prev ? { ...prev, model: text } : null)}
                          className="mt-1"
                        />
                      </View>

                      {/* Year */}
                      <View>
                        <Label className="mb-1">Year</Label>
                        <Input
                          placeholder="e.g. 2022"
                          // 🚩 FLAG: type="number" → keyboardType="numeric"
                          keyboardType="numeric"
                          value={editingVehicle?.year || ''}
                          onChangeText={(text) => setEditingVehicle(prev => prev ? { ...prev, year: text } : null)}
                          className="mt-1"
                        />
                      </View>

                      {/* Mileage Rate */}
                      <View>
                        <Label className="mb-1">Mileage Rate ($ per mile)</Label>
                        <Input
                          // 🚩 FLAG: type="number" step="0.001" → keyboardType="decimal-pad"
                          keyboardType="decimal-pad"
                          placeholder={`e.g. ${irsRate}`}
                          value={editingVehicle?.mileageRate?.toString() || ''}
                          onChangeText={(text) => setEditingVehicle(prev =>
                            prev ? { ...prev, mileageRate: parseFloat(text) || 0 } : null
                          )}
                          className="mt-1"
                        />
                        <Text className="text-xs text-muted-foreground mt-1">
                          IRS standard rate for {taxYear}: ${irsRate}/mile
                        </Text>
                      </View>

                      {/* Start Year Mileage */}
                      <View>
                        <Label className="mb-1">Start of Year Mileage</Label>
                        <Input
                          keyboardType="numeric"
                          placeholder="e.g. 45000"
                          value={editingVehicle?.startYearMileage?.toString() || ''}
                          onChangeText={(text) => setEditingVehicle(prev =>
                            prev ? { ...prev, startYearMileage: text ? parseInt(text) : undefined } : null
                          )}
                          className="mt-1"
                        />
                      </View>

                      {/* End Year Mileage */}
                      <View>
                        <Label className="mb-1">End of Year Mileage</Label>
                        <Input
                          keyboardType="numeric"
                          placeholder="e.g. 52000"
                          value={editingVehicle?.endYearMileage?.toString() || ''}
                          onChangeText={(text) => setEditingVehicle(prev =>
                            prev ? { ...prev, endYearMileage: text ? parseInt(text) : undefined } : null
                          )}
                          className="mt-1"
                        />
                      </View>

                      {/* Is Default — 🚩 FLAG: <input type="checkbox"> → Switch */}
                      <View className="flex-row items-center justify-between pt-2">
                        <Label>Set as default vehicle</Label>
                        <Switch
                          checked={editingVehicle?.isDefault || false}
                          onCheckedChange={(checked) => setEditingVehicle(prev =>
                            prev ? { ...prev, isDefault: checked } : null
                          )}
                        />
                      </View>
                    </View>
                  </ScrollView>

                  <View className="flex-row justify-end gap-2 px-4 py-3 border-t border-border">
                    <Button variant="outline" onPress={() => setIsVehicleDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onPress={handleSaveVehicle}>Save Vehicle</Button>
                  </View>
                </View>
              </KeyboardAvoidingView>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Card>
        <CardContent className="pt-6">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-xl font-semibold text-foreground">Vehicles</Text>
            <Button onPress={handleAddVehicle} size="sm">Add Vehicle</Button>
          </View>

          <View className="space-y-4">
            {vehicles.length === 0 ? (
              <Text className="text-muted-foreground">No vehicles added yet. Add a vehicle to track mileage.</Text>
            ) : (
              [...vehicles].sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0)).map(vehicle => (
                <Card key={vehicle.id} className="overflow-hidden" style={vehicle.isDefault ? { borderColor: '#84cc16', borderWidth: 2 } : undefined}>
                  <CardContent className="p-4">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center space-x-3 flex-1">
                        {/* 🚩 FLAG: inline SVG → lucide-react-native Car icon */}
                        <View className="p-2">
                          <Car size={20} color={vehicle.isDefault ? "#84cc16" : "#6b7280"} />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="font-medium text-foreground">{vehicle.name}</Text>
                            {vehicle.isDefault && (
                              <View className="ml-2 bg-lime-500 rounded px-2 py-0.5">
                                <Text className="text-xs text-white font-medium">Default</Text>
                              </View>
                            )}
                          </View>
                          <Text className="text-sm text-muted-foreground">
                            {vehicle.make} {vehicle.model} {vehicle.year}
                          </Text>
                          <Text className="text-sm text-muted-foreground">
                            ${vehicle.mileageRate}/mile
                          </Text>
                          <Text className="text-xs text-muted-foreground mt-1">
                            {`Start of ${currentYear}: ${vehicle.startYearMileage != null ? vehicle.startYearMileage.toLocaleString() + ' miles' : '—'}`}
                          </Text>
                          <Text className="text-xs text-muted-foreground">
                            {`End of ${currentYear}: ${vehicle.endYearMileage != null ? vehicle.endYearMileage.toLocaleString() + ' miles' : '—'}`}
                          </Text>
                        </View>
                      </View>

                      <View className="flex-row items-center space-x-2">
                        {!vehicle.isDefault && vehicle.id && (
                          <Button
                            variant="outline"
                            size="sm"
                            onPress={() => handleSetDefault(vehicle.id!)}
                          >
                            Set Default
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onPress={() => handleEditVehicle(vehicle)}
                        >
                          <Pencil size={16} color="#374151" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onPress={() => {
                            setEditingVehicle(vehicle);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </Button>
                      </View>
                    </View>
                  </CardContent>
                </Card>
              ))
            )}
          </View>
        </CardContent>
      </Card>
    </>
  );
};

export default VehiclesSettings;
