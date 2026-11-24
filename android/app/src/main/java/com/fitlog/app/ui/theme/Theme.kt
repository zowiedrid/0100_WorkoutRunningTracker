package com.fitlog.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/** Token warna yang sama dengan variabel warna di file Figma. */
object Fit {
    val Bg = Color(0xFF0F0F0E)
    val Surface = Color(0xFF1A1A18)
    val Surface2 = Color(0xFF262622)
    val Border = Color(0xFF33332E)
    val Text = Color(0xFFF4F2EC)
    val Muted = Color(0xFF9A978D)
    val Accent = Color(0xFFD7FF3F)
    val Ink = Color(0xFF0F0F0E)
    val Danger = Color(0xFFFF6B4A)
    val Push = Color(0xFFFF8A5B)
    val Pull = Color(0xFF6CC4FF)
    val Legs = Color(0xFF8EE3A1)
    val Core = Color(0xFFFFD166)

    fun split(s: String?) = when (s) {
        "push" -> Push; "pull" -> Pull; "legs" -> Legs; "core" -> Core; else -> Muted
    }
}

private val scheme = darkColorScheme(
    primary = Fit.Accent, onPrimary = Fit.Ink,
    secondary = Fit.Accent, onSecondary = Fit.Ink,
    background = Fit.Bg, onBackground = Fit.Text,
    surface = Fit.Surface, onSurface = Fit.Text,
    surfaceVariant = Fit.Surface2, onSurfaceVariant = Fit.Muted,
    outline = Fit.Border, error = Fit.Danger,
)

private fun t(size: Int, weight: FontWeight, spacing: Double = 0.0) =
    TextStyle(fontFamily = FontFamily.SansSerif, fontSize = size.sp, fontWeight = weight, letterSpacing = spacing.sp)

private val typography = Typography(
    headlineLarge = t(30, FontWeight.Bold, -0.6),
    headlineMedium = t(24, FontWeight.Bold, -0.4),
    titleLarge = t(20, FontWeight.Bold, -0.2),
    titleMedium = t(16, FontWeight.SemiBold),
    bodyLarge = t(16, FontWeight.Normal),
    bodyMedium = t(14, FontWeight.Normal),
    bodySmall = t(12, FontWeight.Normal),
    labelLarge = t(15, FontWeight.Bold),
    labelSmall = t(11, FontWeight.Bold, 1.0),
)

@Composable
fun FitLogTheme(content: @Composable () -> Unit) {
    // Desain Workout & Running Tracker hanya dibuat versi gelap (sesuai Figma), jadi tema sistem tidak dipakai.
    @Suppress("UNUSED_VARIABLE") val dark = isSystemInDarkTheme()
    MaterialTheme(colorScheme = scheme, typography = typography, content = content)
}
