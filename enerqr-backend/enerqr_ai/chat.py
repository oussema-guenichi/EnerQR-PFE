import httpx

def get_chat_response(message: str, client):
    """
    محرك الدردشة الذكي - يستخدم Ollama (Gemma3) محلياً
    """

    # بناء معلومات المضخة إن وجدت
    if client:
        context = f"Le client possède une pompe {client.type_pac} modèle {client.modele_pac}. Consommation: {client.conso_estimee_apres_kwh} kWh/an. Prix kWh: {client.prix_kwh} EUR."
    else:
        context = "Le client n'a pas encore de pompe à chaleur."

    prompt = f"""[INST] Tu es un conseiller énergie de l'entreprise EnerQR. Réponds en français, sois poli et concis (2-3 phrases max).
Contexte: {context}
Question: {message} [/INST]"""

    try:
        response = httpx.post(
            "http://localhost:11434/api/generate",
            json={"model": "gemma3:1b", "prompt": prompt, "stream": False},
            timeout=90.0
        )

        if response.status_code == 200:
            return response.json().get("response", "Désolé, je n'ai pas pu formuler de réponse.")
        else:
            return f"Service IA temporairement indisponible (Erreur {response.status_code})."

    except httpx.ReadTimeout:
        return "Le modèle est en cours de chargement, veuillez réessayer dans quelques secondes."
    except Exception as e:
        return f"Erreur de connexion IA: {str(e)}"
