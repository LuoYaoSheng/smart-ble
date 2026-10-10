plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val releaseSigningKeys = listOf("SMART_BLE_KEYSTORE", "SMART_BLE_STORE_PASSWORD", "SMART_BLE_KEY_ALIAS", "SMART_BLE_KEY_PASSWORD")
val hasReleaseSigning = releaseSigningKeys.all { !System.getenv(it).isNullOrBlank() }
if (System.getenv("SMART_BLE_REQUIRE_SIGNING") == "1" && !hasReleaseSigning) {
    throw GradleException("Release signing requires SMART_BLE_KEYSTORE, SMART_BLE_STORE_PASSWORD, SMART_BLE_KEY_ALIAS, SMART_BLE_KEY_PASSWORD")
}

android {
    namespace = "com.smartble"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.i2kai.open.smartble"
        minSdk = 24
        targetSdk = 36
        versionCode = 101
        versionName = rootProject.file("../../VERSION").readText().trim()

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
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
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        viewBinding = true
        compose = true
        buildConfig = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.4"
    }

    testOptions {
        // JVM 单测直接调用 Logger（内部 android.util.Log）时不抛 not-mocked
        unitTests.isReturnDefaultValues = true
    }
}

dependencies {
    // Core Android
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
    implementation("androidx.activity:activity-compose:1.8.1")

    // Compose BOM
    implementation(platform("androidx.compose:compose-bom:2023.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3:1.1.2")
    implementation("androidx.compose.material:material-icons-extended")

    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.5")

    // ViewModel
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.6.2")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.6.2")

    // Permissions
    implementation("com.google.accompanist:accompanist-permissions:0.32.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

    // Unit tests
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20240303")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")

    // Debug
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
