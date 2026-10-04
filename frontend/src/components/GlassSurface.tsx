import React from "react";
import { Platform, StyleSheet, View, ViewProps } from "react-native";
import { BlurView, BlurTint } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";

let canUseLiquidGlass = false;
try {
  if (Platform.OS === "ios" && typeof isLiquidGlassAvailable === "function") {
    canUseLiquidGlass = isLiquidGlassAvailable();
  }
} catch {
  canUseLiquidGlass = false;
}

export interface GlassSurfaceProps extends ViewProps {
  intensity?: number;
  tint?: BlurTint;
  liquid?: boolean;
  interactive?: boolean;
  borderRadius?: number;
  glassBorder?: boolean;
  children?: React.ReactNode;
}

/**
 * Universal Glass Surface Component
 * - iOS: Uses Apple's native Liquid Glass effect (expo-glass-effect) or UIVisualEffectView (expo-blur)
 * - Android: Uses hardware-accelerated RenderEffect (Android 12+ SDK 31) with Material elevation fallback
 */
export default function GlassSurface({
  children,
  intensity = 65,
  tint = "systemUltraThinMaterialLight",
  liquid = true,
  interactive = false,
  borderRadius = 18,
  glassBorder = true,
  style,
  ...rest
}: GlassSurfaceProps) {
  const borderStyles = glassBorder
    ? {
        borderWidth: StyleSheet.hairlineWidth * 1.5,
        borderColor: Platform.OS === "ios" ? "rgba(255, 255, 255, 0.45)" : "rgba(255, 255, 255, 0.65)",
      }
    : null;

  // 1. iOS Liquid Glass (Apple native effect)
  if (Platform.OS === "ios" && liquid && canUseLiquidGlass) {
    return (
      <View
        style={[
          styles.container,
          { borderRadius },
          borderStyles,
          style,
        ]}
        {...rest}
      >
        <GlassView
          glassEffectStyle="regular"
          isInteractive={interactive}
          style={[StyleSheet.absoluteFill, { borderRadius }]}
        />
        {children}
      </View>
    );
  }

  // 2. iOS & Modern Android: Native BlurView
  return (
    <View
      style={[
        styles.container,
        { borderRadius },
        Platform.OS === "android" && styles.androidElevation,
        borderStyles,
        style,
      ]}
      {...rest}
    >
      <BlurView
        intensity={intensity}
        tint={tint}
        blurMethod={Platform.OS === "android" ? "dimezisBlurViewSdk31Plus" : undefined}
        style={[StyleSheet.absoluteFill, { borderRadius }]}
      />
      {/* Subtle translucent tint layer for ultra-smooth glassmorphism */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius,
            backgroundColor:
              Platform.OS === "ios"
                ? "rgba(255, 255, 255, 0.35)"
                : "rgba(255, 255, 255, 0.78)",
          },
        ]}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
  },
  androidElevation: {
    elevation: 3,
  },
});
