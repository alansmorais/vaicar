package com.vaicar.app

import android.os.Handler
import android.os.Looper
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

object ApiService {
    private val client = OkHttpClient()
    private val gson = Gson()
    private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    private val mainHandler = Handler(Looper.getMainLooper())

    fun fetchMeta(onSuccess: (MetaResponse) -> Unit, onError: (Exception) -> Unit) {
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/meta")
            .get()
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (response.isSuccessful) {
                        val bodyString = response.body?.string() ?: ""
                        val metaResponse = gson.fromJson(bodyString, MetaResponse::class.java)
                        mainHandler.post { onSuccess(metaResponse) }
                    } else {
                        mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (response.isSuccessful) {
                        val bodyString = response.body?.string() ?: ""
                        val type = object : TypeToken<List<Driver>>() {}.type
                        val list: List<Driver> = gson.fromJson(bodyString, type)
                        mainHandler.post { onSuccess(list) }
                    } else {
                        mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (response.isSuccessful) {
                        val bodyString = response.body?.string() ?: ""
                        val searchResponse = gson.fromJson(bodyString, SearchDriversResponse::class.java)
                        mainHandler.post { onSuccess(searchResponse) }
                    } else {
                        mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
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
        onSuccess: (Ride) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mapOf(
            "passengerName" to passengerName,
            "passengerPhone" to passengerPhone,
            "originZoneId" to originId,
            "destinationZoneId" to destId,
            "passengerCount" to passengerCount,
            "requestedDriverId" to driverId,
            "fareBrl" to fare,
            "notes" to notes
        )
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/rides")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (response.isSuccessful) {
                        val bodyString = response.body?.string() ?: ""
                        val ride = gson.fromJson(bodyString, Ride::class.java)
                        mainHandler.post { onSuccess(ride) }
                    } else {
                        mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (response.isSuccessful) {
                        val bodyString = response.body?.string() ?: ""
                        val type = object : TypeToken<List<Ride>>() {}.type
                        val list: List<Ride> = gson.fromJson(bodyString, type)
                        mainHandler.post { onSuccess(list) }
                    } else {
                        mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
                }
            }
        })
    }

    fun updateRideStatus(rideId: String, status: String, onSuccess: (Ride) -> Unit, onError: (Exception) -> Unit) {
        val bodyMap = mapOf("status" to status)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/rides/$rideId/status")
            .put(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (response.isSuccessful) {
                        val bodyString = response.body?.string() ?: ""
                        val ride = gson.fromJson(bodyString, Ride::class.java)
                        mainHandler.post { onSuccess(ride) }
                    } else {
                        mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
                }
            }
        })
    }

    fun registerDriver(
        name: String,
        phone: String,
        cpf: String,
        vehicleModel: String,
        vehiclePlate: String,
        onSuccess: (Driver) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mapOf(
            "name" to name,
            "phone" to phone,
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (response.isSuccessful) {
                        val bodyString = response.body?.string() ?: ""
                        val driver = gson.fromJson(bodyString, Driver::class.java)
                        mainHandler.post { onSuccess(driver) }
                    } else {
                        mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
                }
            }
        })
    }

    fun updateDriverOnline(driverId: String, isOnline: Boolean, onSuccess: (Driver) -> Unit, onError: (Exception) -> Unit) {
        val bodyMap = mapOf("isOnline" to isOnline)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)

        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers/$driverId/online")
            .put(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (response.isSuccessful) {
                        val bodyString = response.body?.string() ?: ""
                        val driver = gson.fromJson(bodyString, Driver::class.java)
                        mainHandler.post { onSuccess(driver) }
                    } else {
                        mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (response.isSuccessful) {
                        val bodyString = response.body?.string() ?: ""
                        val driver = gson.fromJson(bodyString, Driver::class.java)
                        mainHandler.post { onSuccess(driver) }
                    } else {
                        mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
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
                mainHandler.post { onError(e) }
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
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val err = map["error"] as? String ?: "Erro HTTP ${response.code}"
                        mainHandler.post { onError(Exception(err)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
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
                mainHandler.post { onError(e) }
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
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val err = map["error"] as? String ?: "Erro HTTP ${response.code}"
                        mainHandler.post { onError(Exception(err)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
                }
            }
        })
    }

    fun requestDriverPin(
        phone: String,
        onSuccess: (Boolean, String) -> Unit,
        onError: (Exception) -> Unit
    ) {
        val bodyMap = mapOf("phone" to phone)
        val requestBody = gson.toJson(bodyMap).toRequestBody(JSON_MEDIA_TYPE)
        val request = Request.Builder()
            .url("${NetworkConfig.apiBaseUrl}/drivers/auth")
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                mainHandler.post { onError(e) }
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
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val err = map["error"] as? String ?: "Erro HTTP ${response.code}"
                        mainHandler.post { onError(Exception(err)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
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
                mainHandler.post { onError(e) }
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
                        val map = gson.fromJson<Map<String, Any>>(bodyString, object : TypeToken<Map<String, Any>>() {}.type)
                        val err = map["error"] as? String ?: "Erro HTTP ${response.code}"
                        mainHandler.post { onError(Exception(err)) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                try {
                    if (response.isSuccessful) {
                        val bodyString = response.body?.string() ?: ""
                        val type = object : TypeToken<List<Passenger>>() {}.type
                        val list: List<Passenger> = gson.fromJson(bodyString, type)
                        mainHandler.post { onSuccess(list) }
                    } else {
                        mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                    }
                } catch (e: Exception) {
                    mainHandler.post { onError(e) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    mainHandler.post { onSuccess() }
                } else {
                    mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    mainHandler.post { onSuccess() }
                } else {
                    mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    mainHandler.post { onSuccess() }
                } else {
                    mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    mainHandler.post { onSuccess() }
                } else {
                    mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    mainHandler.post { onSuccess() }
                } else {
                    mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
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
                mainHandler.post { onError(e) }
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    mainHandler.post { onSuccess() }
                } else {
                    mainHandler.post { onError(Exception("HTTP Code ${response.code}")) }
                }
            }
        })
    }
}
