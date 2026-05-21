import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../api/api_service.dart';
import 'unified_dashboard.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  bool _isLoginMode = true;
  String _role = 'client';
  
  final TextEditingController _userController = TextEditingController();
  final TextEditingController _emailController = TextEditingController();
  final TextEditingController _passwordController = TextEditingController();
  final TextEditingController _serialController = TextEditingController();
  
  bool _isLoading = false;

  @override
  void dispose() {
    _userController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _serialController.dispose();
    super.dispose();
  }

  void _handleSubmit() async {
    setState(() => _isLoading = true);
    try {
      Map<String, dynamic> result;
      
      if (_isLoginMode) {
        result = await ApiService.login(_userController.text, _passwordController.text, _role, _serialController.text);
      } else {
        result = await ApiService.register(
          _userController.text, 
          _emailController.text, 
          _passwordController.text, 
          _role, 
          _serialController.text
        );
      }
      
      if (!mounted) return;
      
      final userRole = result['role'] ?? _role;
      final userId = result['id'] ?? result['user_id'] ?? '';

      if (userRole == 'client' && result['consentement_rgpd'] == false) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text("Compte créé ! Acceptez le consentement RGPD pour accéder à votre espace."),
            backgroundColor: Color(0xFF26C485),
            duration: Duration(seconds: 4),
          )
        );
      }

      Navigator.pushReplacement(
        context, 
        MaterialPageRoute(builder: (context) => UnifiedDashboardScreen(
          userId: userId,
          role: userRole,
          username: result['username'] ?? _userController.text,
          consentementRgpd: result['consentement_rgpd'] ?? true,
        ))
      );
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.redAccent)
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24.0, vertical: 40.0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Logo
              Container(
                width: 72,
                height: 72,
                decoration: BoxDecoration(
                  color: const Color(0xFF26C485).withOpacity(0.08),
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: const Color(0xFF26C485).withOpacity(0.4),
                    width: 1.5,
                  ),
                ),
                child: const Center(
                  child: Icon(Icons.qr_code_scanner, size: 32, color: Color(0xFF26C485)),
                ),
              ),
              const SizedBox(height: 24),
              
              // Titre
              RichText(
                text: TextSpan(
                  style: GoogleFonts.outfit(
                    fontSize: 24, 
                    fontWeight: FontWeight.w500,
                  ),
                  children: const [
                    TextSpan(text: "Ener", style: TextStyle(color: Colors.white)),
                    TextSpan(text: "QR", style: TextStyle(color: Color(0xFF26C485))),
                  ],
                ),
              ),
              const SizedBox(height: 6),
              
              // Sous-titre
              Text(
                "Portail énergie intelligent",
                style: GoogleFonts.inter(
                  fontSize: 12, 
                  color: Colors.white.withOpacity(0.3),
                  fontWeight: FontWeight.w400,
                ),
              ),
              const SizedBox(height: 40),
              
              // Formulaire
              // Role Selector
              Container(
                margin: const EdgeInsets.only(bottom: 24),
                padding: const EdgeInsets.all(4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.03), 
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.white.withOpacity(0.1), width: 0.5),
                ),
                child: Row(
                  children: [
                    _buildRoleTab('client', 'Client'),
                    _buildRoleTab('technicien', 'Technicien'),
                    _buildRoleTab('admin', 'Admin'),
                  ],
                ),
              ),
              if (!_isLoginMode) ...[
                _buildTextField(_emailController, "ADRESSE EMAIL", "exemple@email.com", Icons.email_outlined, false),
                const SizedBox(height: 16),
              ],
              
              _buildTextField(_userController, "NOM D'UTILISATEUR", "Votre identifiant", Icons.person_outline, false),
              const SizedBox(height: 16),
              
              if (_role == 'admin') ...[
                _buildTextField(_serialController, "CODE SECRET ADMIN", "Obligatoire", Icons.shield_outlined, false),
                const SizedBox(height: 16),
              ],
              
              if (_role == 'technicien') ...[
                _buildTextField(_serialController, "N° SÉRIE TECHNICIEN", "Votre numéro Pro", Icons.badge_outlined, false),
                const SizedBox(height: 16),
              ],

              _buildTextField(_passwordController, "MOT DE PASSE", "••••••••", Icons.lock_outline, true),
              
              const SizedBox(height: 32),
              
              // Bouton Principal
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF26C485),
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    )
                  ),
                  onPressed: _isLoading ? null : _handleSubmit,
                  child: _isLoading 
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(
                        _isLoginMode ? "Se Connecter" : "S'inscrire", 
                        style: GoogleFonts.outfit(
                          fontSize: 15, 
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                ),
              ),
              
              const SizedBox(height: 24),
              
              // Lien Bas de Page
              GestureDetector(
                onTap: () => setState(() => _isLoginMode = !_isLoginMode),
                child: RichText(
                  text: TextSpan(
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                      color: Colors.white.withOpacity(0.25),
                    ),
                    children: [
                      TextSpan(text: _isLoginMode ? "Nouveau ici ? " : "Déjà inscrit ? "),
                      TextSpan(
                        text: _isLoginMode ? "Créer un compte" : "Se connecter",
                        style: const TextStyle(color: Color(0xFF26C485)),
                      ),
                    ],
                  ),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRoleTab(String roleId, String label) {
    bool isSelected = _role == roleId;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _role = roleId),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFF26C485).withOpacity(0.15) : Colors.transparent, 
            borderRadius: BorderRadius.circular(10),
          ),
          child: Center(
            child: Text(
              label, 
              style: GoogleFonts.inter(
                color: isSelected ? const Color(0xFF26C485) : Colors.white.withOpacity(0.4), 
                fontWeight: isSelected ? FontWeight.w500 : FontWeight.w400,
                fontSize: 13
              )
            )
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController ctrl, String label, String placeholder, IconData icon, bool isPassword) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.white.withOpacity(0.1),
          width: 0.5,
        ),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      child: Row(
        children: [
          Icon(icon, color: Colors.white.withOpacity(0.3), size: 18),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  label,
                  style: GoogleFonts.inter(
                    color: Colors.white.withOpacity(0.25),
                    fontSize: 10,
                    fontWeight: FontWeight.w400,
                  ),
                ),
                const SizedBox(height: 2),
                SizedBox(
                  height: 20, // Constrain height to keep everything compact
                  child: TextField(
                    controller: ctrl,
                    obscureText: isPassword,
                    style: GoogleFonts.inter(
                      color: Colors.white,
                      fontSize: 13,
                      fontWeight: FontWeight.w400,
                    ),
                    decoration: InputDecoration(
                      isDense: true,
                      contentPadding: EdgeInsets.zero,
                      hintText: placeholder,
                      hintStyle: GoogleFonts.inter(
                        color: Colors.white.withOpacity(0.5),
                        fontSize: 13,
                        fontWeight: FontWeight.w400,
                      ),
                      border: InputBorder.none,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
