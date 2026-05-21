import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiConfig {
  // ----------------------------------------------------
  // IMPORTANT: Configuration de l'IP du Backend FastAPI
  // ----------------------------------------------------
  // 1. Pour l'Émulateur Android (Android Studio), utilisez 10.0.2.2
  static const String baseUrl = 'http://192.168.1.2:8000';
  
  // 2. Pour votre téléphone Physique connecté en WiFi ou USB, 
  // mettez l'IP exacte de la machine (Ex: http://192.168.1.15:8000)
  // static const String baseUrl = 'http://192.168.X.X:8000';
}

class ApiService {
  // Fonction de connexion API (Login)
  static Future<Map<String, dynamic>> login(String username, String password, String role, [String? numeroSerie]) async {
    final Map<String, dynamic> body = {'username': username, 'password': password, 'role': role};
    if (numeroSerie != null && numeroSerie.isNotEmpty) {
      body['numero_serie'] = numeroSerie;
    }
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      
      // Stocker les infos dans le téléphone (Session)
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_id', data['user_id']);
      await prefs.setString('role', data['role']);
      await prefs.setBool('consentement_rgpd', data['consentement_rgpd']);
      
      return data;
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? "Erreur de connexion");
    }
  }

  // Obtenir les infos complètes d'un client (y compris sa pompe)
  static Future<Map<String, dynamic>> getClientInfo(String userId) async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/client/$userId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    }
    throw Exception("Erreur lors de la récupération des infos client");
  }

  // Fonction de création de compte (Register)
  static Future<Map<String, dynamic>> register(String username, String email, String password, String role, String numeroSerie) async {
    final Map<String, dynamic> bodyData = {
      'username': username,
      'email': email,
      'password': password,
      'role': role,
    };
    // Admin: send secret code as numero_serie
    if (role == 'technicien') bodyData['numero_serie'] = numeroSerie;
    if (role == 'admin') bodyData['numero_serie'] = numeroSerie;

    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(bodyData),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final userId = data['id'] ?? data['user_id'] ?? '';
      
      // Après inscription, on stocke directement sa session (Auto-Login)
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('user_id', userId);
      await prefs.setString('role', data['role'] ?? role);
      await prefs.setBool('consentement_rgpd', data['consentement_rgpd'] ?? false);
      
      return data;
    } else {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? "Erreur d'inscription");
    }
  }

  // Obtenir la prédiction IA du futur
  static Future<double> getAIPrediction(String userId) async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/client/$userId/predict'));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return (data['prediction_kwh'] as num? ?? 0).toDouble();
    }
    return 0.0;
  }

  // Obtenir les statistiques client (économies, consommation)
  static Future<Map<String, dynamic>> getClientStats(String userId) async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/client/$userId/stats'));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception("Erreur Stats Client");
  }

  // Obtenir les campagnes (offres) du client
  static Future<List<dynamic>> getClientCampaigns(String userId) async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/client/$userId/campaigns'));
    if (response.statusCode == 200) return jsonDecode(response.body);
    return [];
  }

  // Obtenir les factures PDF du client
  static Future<List<dynamic>> getClientInvoices(String userId) async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/client/$userId/invoices'));
    if (response.statusCode == 200) return jsonDecode(response.body);
    return [];
  }

  // Interagir avec l'assistant IA
  static Future<String> chatWithAI(String userId, String message) async {
    final response = await http.post(
      Uri.parse('${ApiConfig.baseUrl}/client/$userId/chat?message=${Uri.encodeQueryComponent(message)}'),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body)['reply'] ?? "Désolé, je n'ai pas pu générer de réponse.";
    }
    throw Exception("Erreur IA Chat");
  }

  // --- ENDPOINTS ADMIN & MANAGEMENT ---

  static Future<Map<String, dynamic>> getAdminStats() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/admin/stats'));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception("Erreur Stats");
  }

  static Future<List<dynamic>> getAllClients() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/admin/users'));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception("Erreur Clients");
  }

  static Future<List<dynamic>> getAllPumps() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/admin/pumps'));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception("Erreur Pompes");
  }

  static Future<List<dynamic>> getAllTechniciens() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/admin/techniciens'));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception("Erreur Techniciens");
  }

  static Future<List<dynamic>> getAllAnomalies() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/admin/anomalies'));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception("Erreur Anomalies");
  }

  static Future<List<dynamic>> getAllGaranties() async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/admin/garanties'));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception("Erreur Garanties");
  }

  static Future<void> deleteClient(String id) async {
    await http.delete(Uri.parse('${ApiConfig.baseUrl}/admin/clients/$id'));
  }

  static Future<void> revokeGarantie(String id) async {
    await http.delete(Uri.parse('${ApiConfig.baseUrl}/admin/garanties/$id'));
  }

  static Future<void> assignTechnicien(String anomalyId, String techId) async {
    await http.post(
      Uri.parse('${ApiConfig.baseUrl}/admin/anomalies/$anomalyId/assign/$techId'),
    );
  }

  // --- ENDPOINTS TECHNICIEN ---

  static Future<List<dynamic>> getTechnicienClients(String techId) async {
    final response = await http.get(Uri.parse('${ApiConfig.baseUrl}/technicien/$techId/clients'));
    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception("Erreur Clients Tech");
  }

  static Future<Map<String, dynamic>> updateClientConsumption(String clientId, double consoAvant, double consoApres) async {
    final response = await http.put(
      Uri.parse('${ApiConfig.baseUrl}/technicien/client/$clientId/consumption'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'conso_avant_kwh': consoAvant,
        'conso_estimee_apres_kwh': consoApres,
      }),
    );

    if (response.statusCode == 200) return jsonDecode(response.body);
    throw Exception("Erreur Maj Conso");
  }
}
