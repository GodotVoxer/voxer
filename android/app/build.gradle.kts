import java.net.URI

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.google.services)
}

val siteUrl: String = providers.gradleProperty("VOXER_SITE_URL").get().trimEnd('/')
val siteHost: String = URI(siteUrl).host

android {
    namespace = "pro.voxer.app"
    compileSdk = 37

    defaultConfig {
        applicationId = "pro.voxer.app"
        minSdk = 26
        targetSdk = 36
        versionCode = providers.gradleProperty("VOXER_VERSION_CODE").get().toInt()
        versionName = providers.gradleProperty("VOXER_VERSION_NAME").get()

        buildConfigField("String", "SITE_URL", "\"$siteUrl\"")
        buildConfigField("String", "SITE_HOST", "\"$siteHost\"")
        // Extra hosts that load inside the app, such as an SSO login in front of a private instance.
        val trustedHosts = providers.gradleProperty("VOXER_TRUSTED_HOSTS").orElse("").get()
        buildConfigField("String", "TRUSTED_HOSTS", "\"$trustedHosts\"")
        // Intent filters do not accept BuildConfig placeholders: it goes through manifestPlaceholders.
        manifestPlaceholders["siteHost"] = siteHost
    }

    flavorDimensions += "distribution"
    productFlavors {
        // Google Play services: push through Firebase Cloud Messaging.
        create("gms") {
            dimension = "distribution"
            buildConfigField("boolean", "HAS_PLAY_STORE", "true")
        }
        // Free software only, for F-Droid: push through the user's UnifiedPush distributor.
        create("fdroid") {
            dimension = "distribution"
            buildConfigField("boolean", "HAS_PLAY_STORE", "false")
        }
    }

    // A blob only Google can read; F-Droid rejects it.
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }

    signingConfigs {
        create("release") {
            val storePath = providers.gradleProperty("VOXER_KEYSTORE_FILE").orNull
            if (storePath != null) {
                storeFile = file(storePath)
                storePassword = providers.gradleProperty("VOXER_KEYSTORE_PASSWORD").orNull
                keyAlias = providers.gradleProperty("VOXER_KEY_ALIAS").orNull
                keyPassword = providers.gradleProperty("VOXER_KEY_PASSWORD").orNull
            }
            // minSdk 26 does not need the v1 (JAR) signing scheme.
            enableV1Signing = false
            enableV2Signing = true
            enableV3Signing = true
        }
    }

    buildTypes {
        debug {
            applicationIdSuffix = ".debug"
            versionNameSuffix = "-debug"
            isMinifyEnabled = false
        }
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            // Signed only when the keystore is configured; otherwise the APK is unsigned and will not install.
            if (providers.gradleProperty("VOXER_KEYSTORE_FILE").orNull != null) {
                signingConfig = signingConfigs.getByName("release")
            }
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }


    buildFeatures {
        buildConfig = true
        viewBinding = true
    }
}

// Firebase configuration only exists for `gms` (app/src/gms/google-services.json); the `fdroid`
// variants must not process or depend on it.
tasks.configureEach {
    if (name.contains("Fdroid") && name.contains("GoogleServices")) enabled = false
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.appcompat)
    implementation(libs.androidx.activity.ktx)
    implementation(libs.androidx.core.splashscreen)
    implementation(libs.androidx.webkit)
    implementation(libs.androidx.browser)
    implementation(libs.androidx.swiperefreshlayout)

    "gmsImplementation"(platform(libs.firebase.bom))
    "gmsImplementation"(libs.firebase.messaging)
    "fdroidImplementation"(libs.unifiedpush.connector)

    testImplementation(libs.junit)
    // Real org.json for JVM tests: android.jar only ships stubs.
    testImplementation(libs.json)
}
