package com.vaicar.app

object NetworkConfig {
    // Both production and active preview environments are supported
    const val PRODUCTION_URL = "https://www.vaicar.alansmsolutions.com"
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
    val expiryDate: String?
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
    val ridesCompleted: Int
)

data class Ride(
    val id: String,
    val passengerName: String,
    val passengerPhone: String,
    val originZoneId: String,
    val destinationZoneId: String,
    val passengerCount: Int,
    val requestedDriverId: String?,
    val matchedDriverId: String?,
    val fareBrl: Double,
    val status: String, // REQUESTED, ACCEPTED, EN_ROUTE, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED_BY_PASSENGER, CANCELLED_BY_DRIVER
    val createdAt: String,
    val notes: String?
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
