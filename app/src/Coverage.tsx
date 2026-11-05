import React, { useState } from "react";
import { Text, View, Pressable, StyleSheet } from "react-native";
export function Coverage({ dataset }: { dataset: any }) {
  const [expanded, setExpanded] = useState<string | null>(null),
    [limit, setLimit] = useState(50);
  if (!dataset)
    return (
      <Text style={s.copy}>
        Coverage details appear after an import. The fictional example never
        connects to Garmin.
      </Text>
    );
  const audit = dataset.activityAudit;
  return (
    <View style={s.section}>
      <Text style={s.heading}>Your data coverage</Text>
      <Text style={s.copy}>
        {dataset.notice}. {dataset.year} · {dataset.period?.timeZone}.{" "}
        {dataset.stories.length} supported stories.
      </Text>
      {dataset.exampleOnly && (
        <Text style={s.copy}>
          Fictional records only. No Garmin account is connected.
        </Text>
      )}
      {dataset.warnings?.map((warning: string, i: number) => (
        <Text style={s.copy} key={i}>
          • {warning}
        </Text>
      ))}
      {audit && (
        <>
          <Text style={s.copy}>
            {audit.received} records received · {audit.counted} activities
            counted. Excluded: {audit.excluded.duplicates} duplicate records,{" "}
            {audit.excluded.children} multisport children,{" "}
            {audit.excluded.outsidePeriod} outside this period.
          </Text>
          {audit.sports.map((sport: any) => (
            <View key={sport.key}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: expanded === sport.key }}
                style={s.button}
                onPress={() => {
                  setExpanded(expanded === sport.key ? null : sport.key);
                  setLimit(50);
                }}
              >
                <Text style={s.copy}>
                  {sport.label} · {sport.count} activities{" "}
                  {expanded === sport.key ? "−" : "+"}
                </Text>
              </Pressable>
              {expanded === sport.key && (
                <>
                  <Text style={s.copy}>
                    {sport.types
                      .map((type: any) => `${type.type}: ${type.count}`)
                      .join(", ")}
                  </Text>
                  {sport.activities
                    .slice(0, limit)
                    .map((activity: any, i: number) => (
                      <Text style={s.copy} key={i}>
                        {activity.date} · {activity.type} ·{" "}
                        {activity.duration === null
                          ? "time unavailable"
                          : `${activity.duration} s`}{" "}
                        ·{" "}
                        {activity.distance === null
                          ? "distance unavailable"
                          : `${activity.distance} m`}
                      </Text>
                    ))}
                  {sport.activities.length > limit && (
                    <Pressable
                      style={s.button}
                      onPress={() => setLimit((n) => n + 50)}
                    >
                      <Text style={s.copy}>Show 50 more activities</Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          ))}
        </>
      )}
      <Text style={s.copy}>
        Missing measurements stay missing. Totals require complete measurements;
        unavailable optional sources are omitted with a warning. Daily dates
        follow Garmin; activity dates use the selected time zone.
      </Text>
    </View>
  );
}
const s = StyleSheet.create({
  section: { gap: 16 },
  heading: { color: "#fff", fontSize: 22, fontWeight: "700" },
  copy: { color: "#d0d9ed", fontSize: 15, lineHeight: 23 },
  button: {
    minHeight: 48,
    justifyContent: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#394762",
  },
});
