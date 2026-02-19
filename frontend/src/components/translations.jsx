/**
 * @file translations.jsx
 * @description Legacy translation strings for en, fr, and it locales used by the
 * old useTranslation hook. These cover navigation, common actions, dashboard,
 * rules, rule editor steps, OCR identifiers, and dynamic extraction UI labels.
 * Note: The primary i18n system now uses JSON locale files under src/i18n/locales/.
 */
import React, { useState, useEffect } from 'react';

export const translations = {
  en: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_rules: "Rules",
    nav_evaluation: "Rule Evaluation",
    nav_logs: "Logs",
    nav_settings: "Settings",
    nav_guide: "Guide",
    nav_user: "User",
    nav_logout: "Logout",
    
    // Common
    common_save: "Save",
    common_cancel: "Cancel",
    common_delete: "Delete",
    common_edit: "Edit",
    common_create: "Create",
    common_back: "Back",
    common_next: "Next",
    common_previous: "Previous",
    common_finish: "Finish",
    common_close: "Close",
    common_search: "Search",
    common_filter: "Filter",
    common_sort: "Sort",
    common_actions: "Actions",
    common_status: "Status",
    common_loading: "Loading...",
    common_saving: "Saving...",
    common_no_data: "No data available",
    common_confirm: "Confirm",
    common_duplicate: "Duplicate",
    common_view: "View",
    
    // Status
    status_active: "Active",
    status_inactive: "Inactive",
    status_draft: "Draft",
    status_enabled: "Enabled",
    status_disabled: "Disabled",
    
    // Dashboard
    dashboard_title: "Dashboard",
    dashboard_subtitle: "Overview of your document classification system",
    dashboard_active_rules: "Active Rules",
    dashboard_draft_rules: "Draft Rules",
    dashboard_documents_processed: "Documents Processed",
    dashboard_avg_poco: "Average POCO Score",
    dashboard_unclassified: "Documents without Rules",
    dashboard_unclassified_desc: "These documents don't match any active rules",
    dashboard_create_rule: "Create New Rule",
    
    // Rules
    rules_title: "Rules",
    rules_subtitle: "Manage your document classification rules",
    rules_create: "Create New Rule",
    rules_search_placeholder: "Search rules...",
    rules_sort_by: "Sort by",
    rules_no_rules: "No rules found",
    rules_confirm_delete: "Are you sure you want to delete this rule?",
    rules_cannot_undo: "This action cannot be undone.",
    
    // Rule Editor
    editor_create_title: "Create New Rule",
    editor_edit_title: "Edit Rule",
    editor_unsaved_warning: "You have unsaved changes. Are you sure you want to leave?",
    editor_save_success: "Rule saved successfully!",
    editor_save_error: "Error saving rule. Please try again.",
    editor_validation_error: "Please complete the required fields.",
    editor_view_ocr: "View OCR",
    editor_view_pdf: "View PDF",
    editor_selected_file: "Selected file:",
    
    // Steps
    step_1_title: "Step 1 of 6: Basic Information",
    step_1_subtitle: "Define the basic rule information",
    step_2_title: "Step 2 of 6: OCR Identifiers",
    step_2_subtitle: "Configure patterns to identify documents based on OCR content",
    step_3_title: "Step 3 of 6: Document Classifications",
    step_3_subtitle: "Configure document classification",
    step_4_title: "Step 4 of 6: Filename Identification",
    step_4_subtitle: "Define filename patterns",
    step_5_title: "Step 5 of 6: Data Verification",
    step_5_subtitle: "Configure verification",
    step_6_title: "Step 6 of 6: Review & Summary",
    step_6_subtitle: "Review configuration",
    
    // Step 2 - OCR Identifiers
    ocr_identifiers_tooltip: "Define text patterns found in document content that help identify the document type. Each logic group can contain multiple patterns with different matching rules.",
    ocr_identifiers_description: "Define patterns that identify this document type by its text content",
    ocr_identifiers_warning: "You've only configured {filledGroups} logic group(s) with patterns. We recommend at least 3 for reliable classification.",
    add_logic_group: "Add Logic Group",
    ocr_score_requirement: "OCR Score Requirement: {tempOcrThreshold}%",
    ocr_score_requirement_tooltip: "Minimum percentage of OCR patterns that must match. If fewer patterns match than this threshold, the rule fails immediately.",
    ocr_score_requirement_description: "Minimum OCR matching percentage required for this rule to pass. If the OCR match rate is below this threshold, the rule will fail immediately.",
    permissive: "Permissive",
    recommended: "Recommended",
    very_strict: "Very Strict",
    ocr_weight_multiplier: "OCR Weight Multiplier: {tempMultiplier}×",
    ocr_weight_multiplier_tooltip: "Controls how much influence OCR content has in the final POCO score. Higher values mean OCR patterns are more important.",
    ocr_weight_multiplier_description: "Controls how much influence OCR patterns have on the final POCO score. The default value of 3× means OCR patterns contribute three times their base value to the score.",
    low_weight: "Low Weight",
    medium_weight: "Medium",
    high_weight: "High Weight",
    default_weight: "Default",
    configuration_summary: "Configuration Summary",
    logic_groups_summary: "Logic Groups",
    with_total_identifiers: "with a total of {totalIdentifiers} OCR identifiers (including AND)",
    ocr_score_requirement_summary: "OCR Score Requirement",
    ocr_pattern_weight_summary: "OCR Pattern weight",
    points: "points",
    ocr_multiplier_summary: "OCR Multiplier",
    max_ocr_weight_summary: "Maximum OCR weight for Poco Score",
    change_ocr_score_requirement_title: "Change OCR Score Requirement?",
    change_ocr_score_requirement_message: "You're changing the OCR Score requirement from 75% (recommended) to {pendingOcrThreshold}%. {pendingOcrThreshold < 75 ? 'Lower values may result in false positives (incorrect classifications).' : 'Higher values may result in missing valid documents that should be classified.'} Are you sure?",
    yes_change_it: "Yes, Change It",
    cancel: "Cancel",
    change_ocr_weight_multiplier_title: "Change OCR Weight Multiplier?",
    change_ocr_weight_multiplier_message: "You're changing the OCR Weight multiplier from 3× (recommended) to {pendingMultiplier}×. This will significantly affect how OCR patterns influence the final POCO score. Are you sure?",
    
    // Step 3 specific
    no_dynamic_extraction_rules: "No Dynamic Extraction Rules",
    add_extraction_rules_description: "Add rules to extract data from OCR content dynamically",
    add_first_rule: "Add First Rule",
    dynamic_extraction_rule_number: "Dynamic Extraction Rule #{number}",
    target_field: "Target Field",
    select_target_field: "Select target field...",
    already_used: "already used",
    before_anchor: "Before Anchor",
    after_anchor: "After Anchor",
    enter_text_or_regex_pattern: "Enter text or regex pattern...",
    extraction_type: "Extraction Type",
    date_format: "Date Format",
    select_or_enter_date_format: "Select or enter date format...",
    select_tag_to_extract: "Select Tag to Extract",
    select_tag: "Select tag...",
    pattern_to_match: "Pattern to Match",
    select_target_field_to_configure_extraction: "Select a target field to configure extraction",
    add_extraction_rule: "Add Extraction Rule",
    date_created_field: "Date Created",
    custom_field_1: "Custom Field 1",
    custom_field_2: "Custom Field 2",
    tags_field: "Tags",

    // Step 3 additional translations
    configure_document_classification: "Configure document classification data extracted from OCR",
    predefined_data: "Predefined Data",
    dynamic_data_extraction: "Dynamic Data Extraction",
    define_anchor_points: "Define anchor points and extraction patterns for dynamic field population",
    enter_document_category: "Enter document category...",
    enter_custom_field_value: "Enter custom field value...",
    
    // Fields
    step1_rule_name: "Rule Name",
    step1_rule_name_placeholder: "e.g., Bank Statement",
    step1_rule_name_help: "Human-readable name",
    step1_rule_id: "Rule ID",
    step1_rule_id_placeholder: "e.g., bank_statement",
    step1_rule_id_help: "Technical identifier",
    step1_description: "Description",
    step1_description_placeholder: "Describe the rule...",
    step1_poco_threshold: "POCO Threshold",
    step1_poco_threshold_help: "Minimum confidence score required",
    step1_threshold_permissive: "Permissive",
    step1_threshold_recommended: "Recommended",
    step1_threshold_strict: "Strict",
  },
  
  fr: {
    // Navigation
    nav_dashboard: "Tableau de bord",
    nav_rules: "Règles",
    nav_evaluation: "Évaluation des règles",
    nav_logs: "Journaux",
    nav_settings: "Paramètres",
    nav_guide: "Guide",
    nav_user: "Utilisateur",
    nav_logout: "Déconnexion",
    
    // Common
    common_save: "Enregistrer",
    common_cancel: "Annuler",
    common_delete: "Supprimer",
    common_edit: "Modifier",
    common_create: "Créer",
    common_back: "Retour",
    common_next: "Suivant",
    common_previous: "Précédent",
    common_finish: "Terminer",
    common_close: "Fermer",
    common_search: "Rechercher",
    common_filter: "Filtrer",
    common_sort: "Trier",
    common_actions: "Actions",
    common_status: "Statut",
    common_loading: "Chargement...",
    common_saving: "Enregistrement...",
    common_no_data: "Aucune donnée disponible",
    common_confirm: "Confirmer",
    common_duplicate: "Dupliquer",
    common_view: "Voir",
    
    // Status
    status_active: "Actif",
    status_inactive: "Inactif",
    status_draft: "Brouillon",
    status_enabled: "Activé",
    status_disabled: "Désactivé",
    
    // Dashboard
    dashboard_title: "Tableau de bord",
    dashboard_subtitle: "Aperçu de votre système de classification de documents",
    dashboard_active_rules: "Règles actives",
    dashboard_draft_rules: "Règles en brouillon",
    dashboard_documents_processed: "Documents traités",
    dashboard_avg_poco: "Score POCO moyen",
    dashboard_unclassified: "Documents sans règles",
    dashboard_unclassified_desc: "Ces documents ne correspondent à aucune règle active",
    dashboard_create_rule: "Créer une nouvelle règle",
    
    // Rules
    rules_title: "Règles",
    rules_subtitle: "Gérer vos règles de classification de documents",
    rules_create: "Créer une nouvelle règle",
    rules_search_placeholder: "Rechercher des règles...",
    rules_sort_by: "Trier par",
    rules_no_rules: "Aucune règle trouvée",
    rules_confirm_delete: "Êtes-vous sûr de vouloir supprimer cette règle ?",
    rules_cannot_undo: "Cette action ne peut pas être annulée.",
    
    // Rule Editor
    editor_create_title: "Créer une nouvelle règle",
    editor_edit_title: "Modifier la règle",
    editor_unsaved_warning: "Vous avez des modifications non enregistrées. Êtes-vous sûr de vouloir quitter ?",
    editor_save_success: "Règle enregistrée avec succès !",
    editor_save_error: "Erreur lors de l'enregistrement de la règle. Veuillez réessayer.",
    editor_validation_error: "Veuillez compléter les champs requis.",
    editor_view_ocr: "Voir l'OCR",
    editor_view_pdf: "Voir le PDF",
    editor_selected_file: "Fichier sélectionné :",
    
    // Steps
    step_1_title: "Étape 1 sur 6 : Informations de base",
    step_1_subtitle: "Définir les informations de base de la règle",
    step_2_title: "Étape 2 sur 6 : Identifiants OCR",
    step_2_subtitle: "Configurer les motifs pour identifier les documents basés sur le contenu OCR",
    step_3_title: "Étape 3 sur 6 : Classifications de documents",
    step_3_subtitle: "Configurer la classification des documents",
    step_4_title: "Étape 4 sur 6 : Identification du nom de fichier",
    step_4_subtitle: "Définir les motifs de nom de fichier",
    step_5_title: "Étape 5 sur 6 : Vérification des données",
    step_5_subtitle: "Configurer la vérification",
    step_6_title: "Étape 6 sur 6 : Révision et résumé",
    step_6_subtitle: "Vérifier la configuration",
    
    // Step 2 - OCR Identifiers
    ocr_identifiers_tooltip: "Définissez les motifs de texte trouvés dans le contenu du document qui aident à identifier le type de document. Chaque groupe logique peut contenir plusieurs motifs avec différentes règles de correspondance.",
    ocr_identifiers_description: "Définir des motifs qui identifient ce type de document par son contenu textuel",
    ocr_identifiers_warning: "Vous n'avez configuré que {filledGroups} groupe(s) logique(s) avec des motifs. Nous recommandons au moins 3 pour une classification fiable.",
    add_logic_group: "Ajouter un groupe logique",
    ocr_score_requirement: "Exigence de score OCR : {tempOcrThreshold}%",
    ocr_score_requirement_tooltip: "Pourcentage minimum de motifs OCR qui doivent correspondre. Si moins de motifs correspondent à ce seuil, la règle échoue immédiatement.",
    ocr_score_requirement_description: "Pourcentage minimum de correspondance OCR requis pour que cette règle soit validée. Si le taux de correspondance OCR est inférieur à ce seuil, la règle échouera immédiatement.",
    permissive: "Permissif",
    recommended: "Recommandé",
    very_strict: "Très Strict",
    ocr_weight_multiplier: "Multiplicateur de poids OCR : {tempMultiplier}×",
    ocr_weight_multiplier_tooltip: "Contrôle l'influence du contenu OCR sur le score POCO final. Des valeurs plus élevées signifient que les motifs OCR sont plus importants.",
    ocr_weight_multiplier_description: "Contrôle l'influence des motifs OCR sur le score POCO final. La valeur par défaut de 3× signifie que les motifs OCR contribuent trois fois leur valeur de base au score.",
    low_weight: "Poids faible",
    medium_weight: "Moyen",
    high_weight: "Poids élevé",
    default_weight: "Par défaut",
    configuration_summary: "Résumé de la configuration",
    logic_groups_summary: "Groupes logiques",
    with_total_identifiers: "avec un total de {totalIdentifiers} identifiants OCR (y compris ET)",
    ocr_score_requirement_summary: "Exigence de score OCR",
    ocr_pattern_weight_summary: "Poids du motif OCR",
    points: "points",
    ocr_multiplier_summary: "Multiplicateur OCR",
    max_ocr_weight_summary: "Poids OCR maximum pour le score Poco",
    change_ocr_score_requirement_title: "Modifier l'exigence de score OCR ?",
    change_ocr_score_requirement_message: "Vous modifiez l'exigence de score OCR de 75% (recommandé) à {pendingOcrThreshold}%. {pendingOcrThreshold < 75 ? 'Des valeurs inférieures peuvent entraîner des faux positifs (classifications incorrectes).' : 'Des valeurs plus élevées peuvent entraîner l\'absence de documents valides qui devraient être classifiés.'} Êtes-vous sûr ?",
    yes_change_it: "Oui, changer",
    cancel: "Annuler",
    change_ocr_weight_multiplier_title: "Modifier le multiplicateur de poids OCR ?",
    change_ocr_weight_multiplier_message: "Vous modifiez le multiplicateur de poids OCR de 3× (recommandé) à {pendingMultiplier}×. Cela affectera considérablement l'influence des motifs OCR sur le score POCO final. Êtes-vous sûr ?",
    
    // Step 3 specific
    no_dynamic_extraction_rules: "Aucune règle d'extraction dynamique",
    add_extraction_rules_description: "Ajouter des règles pour extraire dynamiquement des données du contenu OCR",
    add_first_rule: "Ajouter la première règle",
    dynamic_extraction_rule_number: "Règle d'extraction dynamique n°{number}",
    target_field: "Champ cible",
    select_target_field: "Sélectionner un champ cible...",
    already_used: "déjà utilisé",
    before_anchor: "Avant l'ancre",
    after_anchor: "Après l'ancre",
    enter_text_or_regex_pattern: "Saisir du texte ou un motif regex...",
    extraction_type: "Type d'extraction",
    date_format: "Format de date",
    select_or_enter_date_format: "Sélectionner ou saisir un format de date...",
    select_tag_to_extract: "Sélectionner la balise à extraire",
    select_tag: "Sélectionner une balise...",
    pattern_to_match: "Motif à faire correspondre",
    select_target_field_to_configure_extraction: "Sélectionner un champ cible pour configurer l'extraction",
    add_extraction_rule: "Ajouter une règle d'extraction",
    date_created_field: "Date de création",
    custom_field_1: "Champ personnalisé 1",
    custom_field_2: "Champ personnalisé 2",
    tags_field: "Balises",

    configure_document_classification: "Configurer les données de classification de document extraites de l'OCR",
    predefined_data: "Données prédéfinies",
    dynamic_data_extraction: "Extraction dynamique de données",
    define_anchor_points: "Définir les points d'ancrage et les modèles d'extraction pour le remplissage dynamique des champs",
    enter_document_category: "Entrez la catégorie du document...",
    enter_custom_field_value: "Entrez la valeur du champ personnalisé...",
    
    // Fields
    step1_rule_name: "Nom de la règle",
    step1_rule_name_placeholder: "ex: Relevé bancaire",
    step1_rule_name_help: "Nom lisible par l'homme pour la règle",
    step1_rule_id: "ID de la règle",
    step1_rule_id_placeholder: "ex: releve_bancaire",
    step1_rule_id_help: "Identifiant technique unique pour la règle",
    step1_description: "Description",
    step1_description_placeholder: "Décrivez l'objectif ou le contenu de cette règle...",
    step1_poco_threshold: "Seuil POCO",
    step1_poco_threshold_help: "Score de confiance minimum requis pour qu'un document corresponde à cette règle",
    step1_threshold_permissive: "Permissif",
    step1_threshold_recommended: "Recommandé",
    step1_threshold_strict: "Strict",
  },
  
  it: {
    // Navigation
    nav_dashboard: "Dashboard",
    nav_rules: "Regole",
    nav_evaluation: "Valutazione delle Regole",
    nav_logs: "Registri",
    nav_settings: "Impostazioni",
    nav_guide: "Guida",
    nav_user: "Utente",
    nav_logout: "Esci",
    
    // Common
    common_save: "Salva",
    common_cancel: "Annulla",
    common_delete: "Elimina",
    common_edit: "Modifica",
    common_create: "Crea",
    common_back: "Indietro",
    common_next: "Avanti",
    common_previous: "Precedente",
    common_finish: "Fine",
    common_close: "Chiudi",
    common_search: "Cerca",
    common_filter: "Filtra",
    common_sort: "Ordina",
    common_actions: "Azioni",
    common_status: "Stato",
    common_loading: "Caricamento...",
    common_saving: "Salvataggio...",
    common_no_data: "Nessun dato disponibile",
    common_confirm: "Conferma",
    common_duplicate: "Duplica",
    common_view: "Visualizza",
    
    // Status
    status_active: "Attivo",
    status_inactive: "Inattivo",
    status_draft: "Bozza",
    status_enabled: "Abilitato",
    status_disabled: "Disabilitato",
    
    // Dashboard
    dashboard_title: "Dashboard",
    dashboard_subtitle: "Panoramica del sistema di classificazione dei documenti",
    dashboard_active_rules: "Regole attive",
    dashboard_draft_rules: "Bozze di regole",
    dashboard_documents_processed: "Documenti elaborati",
    dashboard_avg_poco: "Punteggio POCO medio",
    dashboard_unclassified: "Documenti senza regole",
    dashboard_unclassified_desc: "Questi documenti non corrispondono a nessuna regola attiva",
    dashboard_create_rule: "Crea nuova regola",
    
    // Rules
    rules_title: "Regole",
    rules_subtitle: "Gestisci le tue regole di classificazione dei documenti",
    rules_create: "Crea nuova regola",
    rules_search_placeholder: "Cerca regole...",
    rules_sort_by: "Ordina per",
    rules_no_rules: "Nessuna regola trovata",
    rules_confirm_delete: "Sei sicuro di voler eliminare questa regola?",
    rules_cannot_undo: "Questa azione non può essere annullata.",
    
    // Rule Editor
    editor_create_title: "Crea nuova regola",
    editor_edit_title: "Modifica regola",
    editor_unsaved_warning: "Hai modifiche non salvate. Sei sicuro di voler uscire?",
    editor_save_success: "Regola salvata con successo!",
    editor_save_error: "Errore durante il salvataggio della regola. Riprova.",
    editor_validation_error: "Si prega di compilare i campi richiesti.",
    editor_view_ocr: "Visualizza OCR",
    editor_view_pdf: "Visualizza PDF",
    editor_selected_file: "File selezionato:",
    
    // Steps
    step_1_title: "Passo 1 di 6: Informazioni di base",
    step_1_subtitle: "Definisci le informazioni di base della regola",
    step_2_title: "Passo 2 di 6: Identificatori OCR",
    step_2_subtitle: "Configura i pattern per identificare i documenti basati sul contenuto OCR",
    step_3_title: "Passo 3 di 6: Classificazioni dei documenti",
    step_3_subtitle: "Configura la classificazione dei documenti",
    step_4_title: "Passo 4 di 6: Identificazione del nome file",
    step_4_subtitle: "Definisci i pattern del nome file",
    step_5_title: "Passo 5 di 6: Verifica dei dati",
    step_5_subtitle: "Configura la verifica",
    step_6_title: "Passo 6 di 6: Revisione e Riepilogo",
    step_6_subtitle: "Revisiona la configurazione",
    
    // Step 2 - OCR Identifiers
    ocr_identifiers_tooltip: "Definisci i pattern di testo trovati nel contenuto del documento che aiutano a identificare il tipo di documento. Ogni gruppo logico può contenere più pattern con diverse regole di corrispondenza.",
    ocr_identifiers_description: "Definisci i pattern che identificano questo tipo di documento in base al suo contenuto testuale",
    ocr_identifiers_warning: "Hai configurato solo {filledGroups} gruppo/i logico/i con pattern. Si raccomandano almeno 3 per una classificazione affidabile.",
    add_logic_group: "Aggiungi Gruppo Logico",
    ocr_score_requirement: "Requisito punteggio OCR: {tempOcrThreshold}%",
    ocr_score_requirement_tooltip: "Percentuale minima di pattern OCR che devono corrispondere. Se un numero inferiore di pattern corrisponde a questa soglia, la regola fallisce immediatamente.",
    ocr_score_requirement_description: "Percentuale minima di corrispondenza OCR richiesta affinché questa regola venga superata. Se il tasso di corrispondenza OCR è al di sotto di questa soglia, la regola fallirà immediatamente.",
    permissive: "Permissivo",
    recommended: "Raccomandato",
    very_strict: "Molto Rigoroso",
    ocr_weight_multiplier: "Moltiplicatore peso OCR: {tempMultiplier}×",
    ocr_weight_multiplier_tooltip: "Controlla quanto l'influenza del contenuto OCR ha nel punteggio POCO finale. Valori più alti significano che i pattern OCR sono più importanti.",
    ocr_weight_multiplier_description: "Controlla quanta influenza i pattern OCR hanno sul punteggio POCO finale. Il valore predefinito di 3× significa che i pattern OCR contribuiscono tre volte il loro valore base al punteggio.",
    low_weight: "Peso basso",
    medium_weight: "Medio",
    high_weight: "Peso alto",
    default_weight: "Predefinito",
    configuration_summary: "Riepilogo Configurazione",
    logic_groups_summary: "Gruppi Logici",
    with_total_identifiers: "con un totale di {totalIdentifiers} identificatori OCR (incluso E)",
    ocr_score_requirement_summary: "Requisito Punteggio OCR",
    ocr_pattern_weight_summary: "Peso Pattern OCR",
    points: "punti",
    ocr_multiplier_summary: "Moltiplicatore OCR",
    max_ocr_weight_summary: "Peso massimo OCR per Punteggio Poco",
    change_ocr_score_requirement_title: "Cambiare Requisito Punteggio OCR?",
    change_ocr_score_requirement_message: "Stai cambiando il requisito del punteggio OCR dal 75% (raccomandato) a {pendingOcrThreshold}%. {pendingOcrThreshold < 75 ? 'Valori inferiori potrebbero causare falsi positivi (classificazioni errate).' : 'Valori più alti potrebbero causare la mancata classificazione di documenti validi.'} Sei sicuro?",
    yes_change_it: "Sì, cambialo",
    cancel: "Annulla",
    change_ocr_weight_multiplier_title: "Cambiare Moltiplicatore Peso OCR?",
    change_ocr_weight_multiplier_message: "Stai cambiando il moltiplicatore del peso OCR da 3× (raccomandato) a {pendingMultiplier}×. Ciò influenzerà significativamente come i pattern OCR influenzano il punteggio POCO finale. Sei sicuro?",

    // Step 3 specific
    no_dynamic_extraction_rules: "Nessuna regola di estrazione dinamica",
    add_extraction_rules_description: "Aggiungi regole per estrarre dati dal contenuto OCR in modo dinamico",
    add_first_rule: "Aggiungi la prima regola",
    dynamic_extraction_rule_number: "Regola di estrazione dinamica #{number}",
    target_field: "Campo di destinazione",
    select_target_field: "Seleziona campo di destinazione...",
    already_used: "già in uso",
    before_anchor: "Prima dell'ancora",
    after_anchor: "Dopo l'ancora",
    enter_text_or_regex_pattern: "Inserisci testo o pattern regex...",
    extraction_type: "Tipo di estrazione",
    date_format: "Formato data",
    select_or_enter_date_format: "Seleziona o inserisci il formato data...",
    select_tag_to_extract: "Seleziona tag da estrarre",
    select_tag: "Seleziona tag...",
    pattern_to_match: "Pattern da abbinare",
    select_target_field_to_configure_extraction: "Seleziona un campo di destinazione per configurare l'estrazione",
    add_extraction_rule: "Aggiungi regola di estrazione",
    date_created_field: "Data di creazione",
    custom_field_1: "Campo personalizzato 1",
    custom_field_2: "Campo personalizzato 2",
    tags_field: "Tag",

    configure_document_classification: "Configura i dati di classificazione del documento estratti dall'OCR",
    predefined_data: "Dati predefiniti",
    dynamic_data_extraction: "Estrazione dinamica dei dati",
    define_anchor_points: "Definisci punti di ancoraggio e schemi di estrazione per il popolamento dinamico dei campi",
    enter_document_category: "Inserisci la categoria del documento...",
    enter_custom_field_value: "Inserisci il valore del campo personalizzato...",

    // Fields
    step1_rule_name: "Nome regola",
    step1_rule_name_placeholder: "es: Estratto conto",
    step1_rule_name_help: "Nome leggibile per la regola",
    step1_rule_id: "ID regola",
    step1_rule_id_placeholder: "es: estratto_conto",
    step1_rule_id_help: "Identificatore tecnico unico per la regola",
    step1_description: "Descrizione",
    step1_description_placeholder: "Descrivi lo scopo o il contenuto di questa regola...",
    step1_poco_threshold: "Soglia POCO",
    step1_poco_threshold_help: "Punteggio di confidenza minimo richiesto per un documento che corrisponda a questa regola",
    step1_threshold_permissive: "Permissivo",
    step1_threshold_recommended: "Raccomandato",
    step1_threshold_strict: "Rigoroso",
  }
};

// Legacy translation hook. Reads language preference from localStorage and
// looks up keys from the translations object, falling back to English.
export function useTranslation() {
  const [language, setLanguage] = useState('en');

  useEffect(() => {
    try {
      const settings = localStorage.getItem('pococlass_settings');
      if (settings) {
        const parsed = JSON.parse(settings);
        setLanguage(parsed.language || 'en');
      }
    } catch (e) {
      console.error('Error loading language setting:', e);
    }
  }, []);

  // Translate a key with optional placeholder replacement (e.g., {count} -> 5)
  const t = (key, replacements = {}) => {
    let text = translations[language]?.[key] || translations['en'][key] || key;
    
    Object.keys(replacements).forEach(replKey => {
      text = text.replace(`{${replKey}}`, replacements[replKey]);
    });
    
    return text;
  };

  return { t, language };
}
