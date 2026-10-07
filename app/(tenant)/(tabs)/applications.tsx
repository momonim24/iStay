import { useLocalSearchParams } from "expo-router";
import { ApplicationList } from "../../../src/components/application-list";

export default function ApplicationsScreen() {
  const { submitted } = useLocalSearchParams<{ submitted?: string }>();
  return <ApplicationList mode="tenant" submitted={submitted === "1"} />;
}
