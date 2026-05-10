import { usePageTitle } from "@/hooks/usePageTitle";
import MobileSubscriptionFlow from "@/components/mobile/MobileSubscriptionFlow";

const MobileSubscription = () => {
  usePageTitle("Subscription | Shift Tracker");
  return <MobileSubscriptionFlow />;
};

export default MobileSubscription;
