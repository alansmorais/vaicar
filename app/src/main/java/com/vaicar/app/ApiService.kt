package com.vaicar.app

import android.os.Handler
import android.os.Looper
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit

object ApiService {
    private val client = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .writeTimeout(20, TimeUnit.SECONDS)
        .retryOnConnectionFailure(true)
        .build()

    private val gson = Gson()
    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    private val mainHandler = Handler(Looper.getMainLooper())

    fun parseNetworkError(e: Exception): String {
        return when (e) {
            is UnknownHostException -> "Erro de DNS: Não foi possível resolver o endereço do servidor (${e.message}). Verifique a conexão com a internet."
            is SocketTimeoutException -> "Tempo limite esgotado (Timeout): O servidor demorou para responder. Verifique sua conexão e tente novamente."
            is ConnectException -> "Não foi possível conectar ao servidor (Servidor offline ou sem conexão de rede)."
            is IOException -> "Falha de rede: ${e.message ?: "Conexão interrompida"}"
            else -> e.message ?: "Erro inesperado de comunicação"
        }
    }

    fun parseHttpError(responseCode: Int, responseBody: String?): String {
        if (!responseBody.isNullOrBlank()) {
            try {
                val map = gson.fromJson<Map<String, Any>>(responseBody, object : TypeToken<Map<String, Any>>() {}.type)
                val err = map["error"] as? String ?: map["message"] as? String
                if (!err.isNullOrBlank()) return err
            } catch (_: Exception) {}
        }
        return when (responseCode) {
            400 -> "Requisição inválida (400). Verifique os dados informados."
            401 -> "Não autorizado (401). Credenciais incorretas."
            403 -> "Acesso restrito (403). Seu acesso foi bloqueado ou não autorizado."
            404 -> "Recurso não encontrado no servidor (404)."
            500, 502, 503, 504 -> "Erro no servidor ($responseCode). Tente novamente em instantes."
            else -> "Erro HTTP $responseCode do servidor."
        }
    }

    fun fetchMeta(onSuccess: (MetaResponse) -> Unit, onError: (Exception) -> Unit) {
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/meta")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val metaResponse = gson.fromJson(bodyString, MetaResponse::class.java)
                        mainHandler.post { onSuccess(metaResponse) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun fetchDrivers(onSuccess: (List<Driver>) -> Unit, onError: (Exception) -> Unit) {
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val type = object : TypeToken<List<Driver>>() {}.type
                        val list: List<Driver> = gson.fromJson(bodyString, type)
                        mainHandler.post { onSuccess(list) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun searchDrivers(
        originId: String,
        destId: String,
        passengerCount: Int,
        onSuccess: (SearchDriversResponse) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mapOf(
            "originZoneId" to originId,
            "destinationZoneId" to destId,
            "passengerCount" to passengerCount
        )
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/search/drivers")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val searchResponse = gson.fromJson(bodyString, SearchDriversResponse::class.java)
                        mainHandler.post { onSuccess(searchResponse) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun createRide(
        passengerName: String,
        passengerPhone: String,
        originId: String,
        destId: String,
        passengerCount: Int,
        driverId: String,
        fare: Double,
        notes: String?,
        originAddress: String? = null,
        destAddress: String? = null,
        onSuccess: (Ride) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mutableMapOf<String, Any?>(
            "passengerName" to passengerName,
            "passengerPhone" to passengerPhone,
            "originZoneId" to originId,
            "destinationZoneId" to destId,
            "passengerCount" to passengerCount,
            "driverId" to driverId,
            "requestedDriverId" to driverId,
            "fareBrl" to fare,
            "notes" to notes
        )
        if (!originAddress.isNullOrBlank()) {
            bodyMap["originAddress"] = originAddress
        }
        if (!destAddress.isNullOrBlank()) {
            bodyMap["destinationAddress"] = destAddress
            bodyMap["destAddress"] = destAddress
        }
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/rides")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val ride = gson.fromJson(bodyString, Ride::class.java)
                        mainHandler.post { onSuccess(ride) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun fetchRides(onSuccess: (List<Ride>) -> Unit, onError: (Exception) -> Unit) {
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/rides")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val type = object : TypeToken<List<Ride>>() {}.type
                        val list: List<Ride> = gson.fromJson(bodyString, type)
                        mainHandler.post { onSuccess(list) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun getRide(rideId: String, onSuccess: (Ride) -> Unit, onError: (Exception) -> Unit) {
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/rides/$rideId")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val ride = gson.fromJson(bodyString, Ride::class.java)
                        mainHandler.post { onSuccess(ride) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun updateRideStatus(
        rideId: String,
        status: String,
        driverId: String? = null,
        cancellationReason: String? = null,
        paymentReceived: Boolean? = null,
        paymentStatus: String? = null,
        paymentMethod: String? = null,
        paymentPendingReason: String? = null,
        onSuccess: (Ride) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mutableMapOf<String, Any>("status" to status)
        if (!driverId.isNullOrEmpty()) bodyMap["driverId"] = driverId
        if (!cancellationReason.isNullOrEmpty()) bodyMap["cancellationReason"] = cancellationReason
        if (paymentReceived != null) bodyMap["paymentReceived"] = paymentReceived
        if (!paymentStatus.isNullOrEmpty()) bodyMap["paymentStatus"] = paymentStatus
        if (!paymentMethod.isNullOrEmpty()) bodyMap["paymentMethod"] = paymentMethod
        if (!paymentPendingReason.isNullOrEmpty()) bodyMap["paymentPendingReason"] = paymentPendingReason
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/rides/$rideId/status")
            .patch(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val ride = gson.fromJson(bodyString, Ride::class.java)
                        mainHandler.post { onSuccess(ride) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun confirmRidePayment(
        rideId: String,
        paymentMethod: String = "PIX",
        driverId: String? = null,
        notes: String? = null,
        onSuccess: (Ride) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mutableMapOf<String, Any>("paymentMethod" to paymentMethod)
        if (!driverId.isNullOrEmpty()) bodyMap["driverId"] = driverId
        if (!notes.isNullOrEmpty()) bodyMap["notes"] = notes
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/rides/$rideId/confirm-payment")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val rJson = gson.toJson(map["ride"])
                        val ride = gson.fromJson(rJson, Ride::class.java)
                        mainHandler.post { onSuccess(ride) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun contestRidePayment(
        rideId: String,
        reason: String,
        passengerPhone: String? = null,
        onSuccess: (Ride) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mutableMapOf<String, Any>("reason" to reason)
        if (!passengerPhone.isNullOrEmpty()) bodyMap["passengerPhone"] = passengerPhone
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/rides/$rideId/contest-payment")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val rJson = gson.toJson(map["ride"])
                        val ride = gson.fromJson(rJson, Ride::class.java)
                        mainHandler.post { onSuccess(ride) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun fetchUnpaidRides(
        passengerPhone: String? = null,
        onSuccess: (List<Ride>) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val url = if (!passengerPhone.isNullOrEmpty()) {
            "${NetworkConfig.apiBaseUrl}/rides/unpaid?passengerPhone=${java.net.URLEncoder.encode(passengerPhone, "UTF-8")}"
        } else {
            "${NetworkConfig.apiBaseUrl}/rides/unpaid"
        }
        val request = Request.Builder().url(url).get().build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val type = object : TypeToken<List<Ride>>() {}.type
                        val list: List<Ride> = gson.fromJson(bodyString, type)
                        mainHandler.post { onSuccess(list) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun registerDriver(
        name: String,
        phone: String,
        email: String,
        cpf: String,
        vehicleModel: String,
        vehiclePlate: String,
        onSuccess: (Driver) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mapOf(
            "name" to name,
            "phone" to phone,
            "email" to email,
            "cpf" to cpf,
            "vehicleModel" to vehicleModel,
            "vehiclePlate" to vehiclePlate
        )
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val driver = gson.fromJson(bodyString, Driver::class.java)
                        mainHandler.post { onSuccess(driver) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    // Overload for backward compatibility
    fun registerDriver(
        name: String,
        phone: String,
        cpf: String,
        vehicleModel: String,
        vehiclePlate: String,
        onSuccess: (Driver) -> Unit,
        onError: (Exception) -> Unit
    ) {
        registerDriver(name, phone, "", cpf, vehicleModel, vehiclePlate, onSuccess, onError)
    }

    fun updateDriverAvailability(
        driverId: String,
        isOnline: Boolean? = null,
        operatingZones: List<String>? = null,
        onSuccess: (Driver) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mutableMapOf<String, Any>()
        if (isOnline != null) bodyMap["isOnline"] = isOnline
        if (operatingZones != null) bodyMap["operatingZones"] = operatingZones
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers/$driverId/availability")
            .patch(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val driver = gson.fromJson(bodyString, Driver::class.java)
                        mainHandler.post { onSuccess(driver) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun updateDriverOnline(driverId: String, isOnline: Boolean, onSuccess: (Driver) -> Unit, onError: (Exception) -> Unit) {
        updateDriverAvailability(driverId = driverId, isOnline = isOnline, onSuccess = onSuccess, onError = onError)
    }

    fun updateDriverOperatingZones(driverId: String, operatingZones: List<String>, onSuccess: (Driver) -> Unit, onError: (Exception) -> Unit) {
        updateDriverAvailability(driverId = driverId, operatingZones = operatingZones, onSuccess = onSuccess, onError = onError)
    }

    fun updateDriverPricing(
        driverId: String,
        minFare: Double,
        ratePerKm: Double,
        onSuccess: (Driver) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mapOf(
            "minimumFare" to minFare,
            "ratePerKm" to ratePerKm
        )
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers/$driverId/pricing")
            .patch(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val driver = gson.fromJson(bodyString, Driver::class.java)
                        mainHandler.post { onSuccess(driver) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun updateDriverDocument(driverId: String, requirementId: String, status: String, onSuccess: (Driver) -> Unit, onError: (Exception) -> Unit) {
        val bodyMap = mapOf("status" to status)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers/$driverId/documents/$requirementId")
            .put(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val driver = gson.fromJson(bodyString, Driver::class.java)
                        mainHandler.post { onSuccess(driver) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun requestPassengerPin(
        phone: String,
        email: String,
        name: String,
        onSuccess: (Boolean, String) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mutableMapOf<String, String>("phone" to phone)
        if (email.isNotEmpty()) bodyMap["email"] = email
        if (name.isNotEmpty()) bodyMap["name"] = name

        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/passengers/auth")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val codeSent = map["codeSent"] as? Boolean ?: false
                        val msg = map["message"] as? String ?: "PIN enviado!"
                        mainHandler.post { onSuccess(codeSent, msg) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun verifyPassengerPin(
        phone: String,
        pin: String,
        onSuccess: (Passenger) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mapOf("phone" to phone, "verificationCode" to pin)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/passengers/auth")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val passengerJson = gson.toJson(map["passenger"])
                        val passenger = gson.fromJson(passengerJson, Passenger::class.java)
                        mainHandler.post { onSuccess(passenger) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun updateDriverFcmToken(
        driverId: String,
        fcmToken: String,
        onSuccess: () -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mapOf("fcmToken" to fcmToken)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers/$driverId/fcm-token")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        mainHandler.post { onSuccess() }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun requestDriverPin(
        phone: String,
        email: String? = null,
        onSuccess: (Boolean, String) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mutableMapOf<String, String>("phone" to phone)
        if (!email.isNullOrBlank()) {
            bodyMap["email"] = email.trim()
        }
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers/auth")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val codeSent = map["codeSent"] as? Boolean ?: false
                        val msg = map["message"] as? String ?: "PIN enviado!"
                        mainHandler.post { onSuccess(codeSent, msg) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun verifyDriverPin(
        phone: String,
        pin: String,
        onSuccess: (Driver) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mapOf("phone" to phone, "verificationCode" to pin)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers/auth")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val driverJson = gson.toJson(map["driver"])
                        val driver = gson.fromJson(driverJson, Driver::class.java)
                        mainHandler.post { onSuccess(driver) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun fetchPassengers(onSuccess: (List<Passenger>) -> Unit, onError: (Exception) -> Unit) {
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/passengers")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val type = object : TypeToken<List<Passenger>>() {}.type
                        val list: List<Passenger> = gson.fromJson(bodyString, type)
                        mainHandler.post { onSuccess(list) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun blockPassenger(id: String, isBlocked: Boolean, onSuccess: () -> Unit, onError: (Exception) -> Unit) {
        val bodyMap = mapOf("isBlocked" to isBlocked)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/admin/passengers/$id/block")
            .patch(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        mainHandler.post { onSuccess() }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun approveDriver(id: String, onSuccess: () -> Unit, onError: (Exception) -> Unit) {
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/admin/drivers/$id/approve")
            .post(ByteArray(0).toRequestBody(null))
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        mainHandler.post { onSuccess() }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun rejectDriver(id: String, reason: String, onSuccess: () -> Unit, onError: (Exception) -> Unit) {
        val bodyMap = mapOf("reason" to reason)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/admin/drivers/$id/reject")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        mainHandler.post { onSuccess() }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun suspendDriver(id: String, reason: String, onSuccess: () -> Unit, onError: (Exception) -> Unit) {
        val bodyMap = mapOf("reason" to reason)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/admin/drivers/$id/suspend")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        mainHandler.post { onSuccess() }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun blockDriver(id: String, reason: String, onSuccess: () -> Unit, onError: (Exception) -> Unit) {
        val bodyMap = mapOf("reason" to reason)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/admin/drivers/$id/block")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        mainHandler.post { onSuccess() }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun triggerDevAction(action: String, body: Map<String, Any> = mapOf(), onSuccess: () -> Unit, onError: (Exception) -> Unit) {
        val requestBody = gson.toJson(body).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/developer/$action")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        mainHandler.post { onSuccess() }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun updatePassengerProfile(
        passengerId: String,
        name: String? = null,
        phone: String? = null,
        email: String? = null,
        avatarUrl: String? = null,
        onSuccess: (Passenger) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mutableMapOf<String, Any>()
        if (name != null) bodyMap["name"] = name
        if (phone != null) bodyMap["phone"] = phone
        if (email != null) bodyMap["email"] = email
        if (avatarUrl != null) bodyMap["avatarUrl"] = avatarUrl

        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/passengers/$passengerId")
            .patch(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val pJson = gson.toJson(map["passenger"] ?: map)
                        val p = gson.fromJson(pJson, Passenger::class.java)
                        mainHandler.post { onSuccess(p) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun updateDriverProfile(
        driverId: String,
        updates: Map<String, Any>,
        onSuccess: (Driver) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val requestBody = gson.toJson(updates).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers/$driverId")
            .patch(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val dJson = gson.toJson(map["driver"] ?: map)
                        val d = gson.fromJson(dJson, Driver::class.java)
                        mainHandler.post { onSuccess(d) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun submitDriverDocument(
        driverId: String,
        requirementId: String,
        fileUrl: String,
        documentNumber: String? = null,
        expiryDate: String? = null,
        onSuccess: (DriverDocument) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mutableMapOf<String, Any>(
            "requirementId" to requirementId,
            "fileUrl" to fileUrl
        )
        if (documentNumber != null) bodyMap["documentNumber"] = documentNumber
        if (expiryDate != null) bodyMap["expiryDate"] = expiryDate

        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers/$driverId/documents")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val doc = gson.fromJson(bodyString, DriverDocument::class.java)
                        mainHandler.post { onSuccess(doc) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun fetchRideReceipt(
        rideId: String,
        onSuccess: (RideReceipt) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/rides/$rideId/receipt")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val receipt = gson.fromJson(bodyString, RideReceipt::class.java)
                        mainHandler.post { onSuccess(receipt) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }

    fun fetchMobilityMapData(
        onSuccess: (MobilityMapData) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/mobility/map-data")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    val bodyString = response.body?.string() ?: ""
                    if (response.isSuccessful) {
                        val data = gson.fromJson(bodyString, MobilityMapData::class.java)
                        mainHandler.post { onSuccess(data) }
                    } else {
                        val errMsg = parseHttpError(response.code, bodyString)
                        mainHandler.post { onError(Exception(errMsg)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(Exception(parseNetworkError(e), e)) }
                }
            }
        })
    }
}
