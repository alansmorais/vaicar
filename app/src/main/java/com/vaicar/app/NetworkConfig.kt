package com.vaicar.app

object NetworkConfig {
    // Centralized real production backend with live database, authentication, and services
    const val PRODUCTION_URL = "https://vaicar.onrender.com"
    const val PREVIEW_URL = "https://ais-dev-57s7ktjqjz2sxaxitjmcqy-760146523751.europe-west2.run.app"

    var currentBaseUrl = PRODUCTION_URL

    val apiBaseUrl: String
        get() = "$currentBaseUrl/api/v1"
}

// Data models mapping exactly to TypeScript types
data class Zone(
    val id: String,
    val name: String,
    val slug: String,
    val lat: Double,
    val lng: Double,
    val distanceFromCenterKm: Double,
    val isActive: Boolean
)

data class Vehicle(
    val id: String,
    val brand: String,
    val model: String,
    val year: Int,
    val color: String,
    val licensePlate: String,
    val passengerCapacity: Int,
    val isApproved: Boolean
)

data class FixedRoute(
    val originZoneId: String,
    val destinationZoneId: String,
    val price: Double
)

data class DriverPricing(
    val pricingType: String, // KM_ONLY, FIXED_ONLY, BOTH
    val minimumFare: Double,
    val ratePerKm: Double,
    val fixedRoutes: List<FixedRoute>
)

data class DriverDocument(
    val id: String,
    val requirementId: String,
    val status: String, // PENDING, SUBMITTED, APPROVED, REJECTED
    val fileUrl: String,
    val expiryDate: String?,
    val rejectionReason: String? = null,
    val requirementName: String? = null
)

data class Driver(
    val id: String,
    val name: String,
    val phone: String,
    val email: String,
    val cpf: String,
    val avatarUrl: String,
    val professionalCategory: String,
    val licenseNumber: String,
    val regulatoryStatus: String, // PENDING, SUBMITTED, APPROVED, REJECTED, SUSPENDED, BLOCKED
    val subscriptionStatus: String, // ACTIVE, EXPIRED, TRIAL, CANCELLED
    val registrationIndex: Int,
    val monthlyFeeBrl: Double,
    val subscriptionTierName: String,
    val isOnline: Boolean,
    val operatingZones: List<String>,
    val vehicle: Vehicle,
    val pricing: DriverPricing,
    val documents: List<DriverDocument>,
    val ratingAverage: Double,
    val ratingCount: Int,
    val ridesCompleted: Int,
    val whatsappDirectNumber: String? = null
)

data class Ride(
    val id: String,
    val passengerName: String,
    val passengerPhone: String,
    val originZoneId: String,
    val destinationZoneId: String,
    val originAddress: String? = null,
    val destinationAddress: String? = null,
    val originLat: Double? = null,
    val originLng: Double? = null,
    val destinationLat: Double? = null,
    val destinationLng: Double? = null,
    val originMapsLink: String? = null,
    val destinationMapsLink: String? = null,
    val passengerCount: Int = 1,
    val driverId: String? = null,
    val requestedDriverId: String? = null,
    val matchedDriverId: String? = null,
    val driverName: String? = null,
    val driverPhone: String? = null,
    val fareBrl: Double = 0.0,
    val estimatedPrice: Double = 0.0,
    val status: String = "REQUESTED", // REQUESTED, ACCEPTED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED_BY_PASSENGER, CANCELLED_BY_DRIVER
    val paymentMethod: String? = "PIX",
    val paymentStatus: String? = null, // PAID, PAYMENT_PENDING, PAYMENT_CONTESTED, WAIVED, RESOLVED
    val paymentPendingReason: String? = null,
    val amountDue: Double? = null,
    val paidAt: String? = null,
    val contestReason: String? = null,
    val paymentResolutionNotes: String? = null,
    val createdAt: String? = null,
    val notes: String? = null,
    val arrivedAt: String? = null,
    val waitingMinutes: Int? = null,
    val waitingFee: Double? = null
)

data class PlatformMetrics(
    val totalDrivers: Int,
    val approvedDrivers: Int,
    val onlineDrivers: Int,
    val pendingDrivers: Int,
    val totalPassengers: Int,
    val activeSubscriptions: Int,
    val monthlyRecurringRevenue: Double,
    val totalRides: Int,
    val completedRides: Int,
    val activeRides: Int,
    val whatsappContactEvents: Int
)

data class MetaResponse(
    val zones: List<Zone>,
    val metrics: PlatformMetrics
)

data class SearchResult(
    val driverId: String,
    val name: String,
    val avatarUrl: String,
    val ratingAverage: Double,
    val ratingCount: Int,
    val ridesCompleted: Int,
    val professionalCategory: String,
    val vehicle: Vehicle,
    val fare: Double,
    val distanceKm: Double,
    val estimatedDurationMin: Int,
    val arrivalTimeMin: Int,
    val isOnline: Boolean
)

data class SearchDriversResponse(
    val totalFound: Int,
    val distanceKm: Double,
    val estimatedDurationMin: Int,
    val dynamicMultiplier: Double,
    val isDynamicActive: Boolean,
    val results: List<SearchResult>
)

data class Passenger(
    val id: String,
    val name: String,
    val phone: String,
    val email: String,
    val avatarUrl: String?,
    val isBlocked: Boolean,
    val createdAt: String?
)

data class RideReceipt(
    val id: String,
    val receiptCode: String,
    val rideId: String,
    val passengerName: String,
    val passengerPhone: String,
    val passengerEmail: String? = null,
    val driverName: String,
    val driverPhone: String,
    val driverVehicle: String,
    val driverLicensePlate: String? = null,
    val originAddress: String,
    val destinationAddress: String,
    val tripStartTime: String? = null,
    val tripEndTime: String? = null,
    val durationMinutes: Int = 0,
    val distanceKm: Double = 0.0,
    val baseFare: Double = 0.0,
    val waitingMinutes: Int? = null,
    val waitingFee: Double? = null,
    val finalTotal: Double = 0.0,
    val paymentMethod: String = "PIX",
    val paymentStatus: String? = null,
    val createdAt: String? = null
)

data class ZoneDemand(
    val zoneId: String,
    val zoneName: String,
    val lat: Double,
    val lng: Double,
    val onlineDrivers: Int,
    val activeRequests: Int,
    val multiplier: Double,
    val isSurgeActive: Boolean,
    val estimatedPickupMin: Int
)

data class MobilityMapData(
    val zones: List<Zone>,
    val zoneDemand: List<ZoneDemand>,
    val timestamp: String
)
