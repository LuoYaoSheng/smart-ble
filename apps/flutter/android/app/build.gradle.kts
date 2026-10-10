plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
}

val releaseSigningKeys = listOf("SMART_BLE_KEYSTORE", "SMART_BLE_STORE_PASSWORD", "SMART_BLE_KEY_ALIAS", "SMART_BLE_KEY_PASSWORD")
val hasReleaseSigning = releaseSigningKeys.all { !System.getenv(it).isNullOrBlank() }
if (System.getenv("SMART_BLE_REQUIRE_SIGNING") == "1" && !hasReleaseSigning) {
    throw GradleException("Release signing requires SMART_BLE_KEYSTORE, SMART_BLE_STORE_PASSWORD, SMART_BLE_KEY_ALIAS, SMART_BLE_KEY_PASSWORD")
}

android {
    namespace = "com.smartble.flutter"
    compileSdk = 36
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_17.toString()
    }

    defaultConfig {
        applicationId = "com.i2kai.open.smartble"
        minSdk = flutter.minSdkVersion
        targetSdk = 36
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    signingConfigs {
        if (hasReleaseSigning) {
            create("storeRelease") {
                storeFile = file(System.getenv("SMART_BLE_KEYSTORE"))
                storePassword = System.getenv("SMART_BLE_STORE_PASSWORD")
                keyAlias = System.getenv("SMART_BLE_KEY_ALIAS")
                keyPassword = System.getenv("SMART_BLE_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            if (hasReleaseSigning) signingConfig = signingConfigs.getByName("storeRelease")
        }
    }
}

flutter {
    source = "../.."
}
