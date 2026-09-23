package com.vaicar.app

import androidx.compose.material3.ColorScheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

val DarkSlate = Color(0xFF0F172A)
val SurfaceSlate = Color(0xFF1E293B)
val EmeraldGreen = Color(0xFF10B981)
val EmeraldDark = Color(0xFF059669)
val TextPrimary = Color(0xFFF8FAFC)
val TextSecondary = Color(0xFF94A3B8)
val AccentRed = Color(0xFFEF4444)

private val ColorScheme = darkColorScheme(
    primary = EmeraldGreen,
    onPrimary = Color.Black,
    primaryContainer = EmeraldDark,
    onPrimaryContainer = Color.White,
    background = DarkSlate,
    onBackground = TextPrimary,
    surface = SurfaceSlate,
    onSurface = TextPrimary,
    secondary = TextSecondary,
    error = AccentRed
)

@Composable
fun VaiCarTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = ColorScheme,
        content = content
    )
}
