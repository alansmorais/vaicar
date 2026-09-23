package com.vaicar.app

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun DeveloperScreen(onBack: () -> Unit, onUrlChanged: () -> Unit) {
    var selectedBaseUrl by remember { mutableStateOf(NetworkConfig.currentBaseUrl) }
    var isOperating by remember { mutableStateOf(false) }
    var logMessage by remember { mutableStateOf("") }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(DarkSlate)
            .padding(16.dp)
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Header
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Voltar", tint = EmeraldGreen)
                    }
                    Text(
                        text = "Dev Sandbox Cockpit",
                        color = Color.White,
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Bold
                    )
                    Icon(Icons.Default.BugReport, contentDescription = null, tint = EmeraldGreen)
                }
            }

            // Environment selection
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Selecionar Servidor Ativo (API)", color = EmeraldGreen, fontWeight = FontWeight.Bold)
                        Text("Mude o servidor para direcionar chamadas de dados reais no aplicativo.", color = TextSecondary, fontSize = 12.sp)

                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                RadioButton(
                                    selected = selectedBaseUrl == NetworkConfig.PRODUCTION_URL,
                                    onClick = {
                                        selectedBaseUrl = NetworkConfig.PRODUCTION_URL
                                        NetworkConfig.currentBaseUrl = NetworkConfig.PRODUCTION_URL
                                        onUrlChanged()
                                    },
                                    colors = RadioButtonDefaults.colors(selectedColor = EmeraldGreen)
                                )
                                Text("Produção (vaicar.alansmsolutions.com)", color = Color.White, fontSize = 14.sp)
                            }

                            Row(verticalAlignment = Alignment.CenterVertically) {
                                RadioButton(
                                    selected = selectedBaseUrl == NetworkConfig.PREVIEW_URL,
                                    onClick = {
                                        selectedBaseUrl = NetworkConfig.PREVIEW_URL
                                        NetworkConfig.currentBaseUrl = NetworkConfig.PREVIEW_URL
                                        onUrlChanged()
                                    },
                                    colors = RadioButtonDefaults.colors(selectedColor = EmeraldGreen)
                                )
                                Text("Preview Dev (europe-west2.run.app)", color = Color.White, fontSize = 14.sp)
                            }
                        }
                    }
                }
            }

            // Database seeding / actions
            item {
                Card(
                    colors = CardDefaults.cardColors(containerColor = SurfaceSlate),
                    shape = RoundedCornerShape(12.dp)
                ) {
                    Column(modifier = Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text("Banco de Dados & Testes", color = EmeraldGreen, fontWeight = FontWeight.Bold)

                        Button(
                            onClick = {
                                isOperating = true
                                ApiService.triggerDevAction(
                                    action = "seed",
                                    onSuccess = {
                                        isOperating = false
                                        logMessage = "Dados de teste recarregados com sucesso no banco de dados!"
                                    },
                                    onError = {
                                        isOperating = false
                                        logMessage = "Erro ao injetar dados no servidor."
                                    }
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = EmeraldGreen),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Injetar / Resetar Dados de Teste", color = Color.Black, fontWeight = FontWeight.Bold)
                        }

                        Button(
                            onClick = {
                                isOperating = true
                                ApiService.triggerDevAction(
                                    action = "clear",
                                    onSuccess = {
                                        isOperating = false
                                        logMessage = "Banco de dados limpo com sucesso!"
                                    },
                                    onError = {
                                        isOperating = false
                                        logMessage = "Erro ao limpar dados no servidor."
                                    }
                                )
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = AccentRed),
                            shape = RoundedCornerShape(8.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Limpar Banco de Dados (Clear Data)", color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        if (logMessage.isNotEmpty()) {
            Snackbar(
                action = {
                    TextButton(onClick = { logMessage = "" }) {
                        Text("OK", color = EmeraldGreen)
                    }
                },
                containerColor = SurfaceSlate,
                contentColor = Color.White,
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                Text(logMessage)
            }
        }
    }
}
