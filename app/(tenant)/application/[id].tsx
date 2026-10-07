import { useLocalSearchParams } from "expo-router";
import { ApplicationList } from "../../../src/components/application-list";

export default function ApplicationDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = typeof params.id === "string" ? params.id : "";
  return <ApplicationList mode="tenant" applicationId={id} />;
}
