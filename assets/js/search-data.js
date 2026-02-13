// get the ninja-keys element
const ninja = document.querySelector('ninja-keys');

// add the home and posts menu items
ninja.data = [{
    id: "nav-about",
    title: "about",
    section: "Navigation",
    handler: () => {
      window.location.href = "/";
    },
  },{id: "nav-publications",
          title: "publications",
          description: "Peer-reviewed publications and selected highlights.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/publications/";
          },
        },{id: "nav-presentations",
          title: "presentations",
          description: "Talks, invited seminars, and conference presentations.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/presentations/";
          },
        },{id: "nav-cv",
          title: "cv",
          description: "Curriculum Vitae",
          section: "Navigation",
          handler: () => {
            window.location.href = "/cv/";
          },
        },{id: "nav-teaching",
          title: "teaching",
          description: "Courses taught, guest lectures, and training material.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/teaching/";
          },
        },{id: "nav-side-projects",
          title: "side projects",
          description: "Research-adjacent tools, packages, and community initiatives.",
          section: "Navigation",
          handler: () => {
            window.location.href = "/projects/";
          },
        },{id: "nav-posts",
          title: "posts",
          description: "",
          section: "Navigation",
          handler: () => {
            window.location.href = "/posts/";
          },
        },{id: "books-the-godfather",
          title: 'The Godfather',
          description: "",
          section: "Books",handler: () => {
              window.location.href = "/books/the_godfather/";
            },},{id: "news-a-simple-inline-announcement",
          title: 'A simple inline announcement.',
          description: "",
          section: "News",},{id: "news-a-long-announcement-with-details",
          title: 'A long announcement with details',
          description: "",
          section: "News",handler: () => {
              window.location.href = "/news/announcement_2/";
            },},{id: "news-a-simple-inline-announcement-with-markdown-emoji-sparkles-smile",
          title: 'A simple inline announcement with Markdown emoji! :sparkles: :smile:',
          description: "",
          section: "News",},{id: "projects-ml-in-space-and-solar-physics",
          title: 'ML in Space and Solar Physics',
          description: "Curated machine-learning workflows and examples for heliophysics and space-science applications.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/1_ml_in_space/";
            },},{id: "projects-academic-latex-template-package",
          title: 'Academic LaTeX Template Package',
          description: "Reusable LaTeX templates and writing assets for papers, reports, presentations, and academic documents.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/2_academic_latex_package/";
            },},{id: "projects-lmag25-workshop",
          title: 'LMAG25 Workshop',
          description: "Community workshop activity focused on machine-learning applications in geospace and heliophysics research.",
          section: "Projects",handler: () => {
              window.location.href = "/projects/3_lmag25/";
            },},{id: "publications-current-sheet-statistics-in-the-magnetosheath",
          title: 'Current Sheet Statistics in the Magnetosheath',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_3389_fspas_2020_00002";
            },},{id: "publications-classification-of-magnetosheath-jets-using-neural-networks-and-high-resolution-omni-hro-data",
          title: 'Classification of Magnetosheath Jets Using Neural Networks and High Resolution OMNI (HRO) Data...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_3389_fspas_2020_00024";
            },},{id: "publications-classifying-magnetosheath-jets-using-mms-statistical-properties",
          title: 'Classifying Magnetosheath Jets Using MMS: Statistical Properties',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2019JA027754";
            },},{id: "publications-helium-in-the-earth-39-s-foreshock-a-global-vlasiator-survey",
          title: 'Helium in the Earth&amp;#39;s foreshock: a global Vlasiator survey',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_5194_angeo-38-1081-2020";
            },},{id: "publications-magnetosheath-jet-evolution-as-a-function-of-lifetime-global-hybrid-vlasov-simulations-compared-to-mms-observations",
          title: 'Magnetosheath jet evolution as a function of lifetime: global hybrid-Vlasov simulations compared to...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_5194_angeo-39-289-2021";
            },},{id: "publications-causes-of-jets-in-the-quasi-perpendicular-magnetosheath",
          title: 'Causes of Jets in the Quasi‐Perpendicular Magnetosheath',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2021GL093173";
            },},{id: "publications-on-the-generation-of-pi2-pulsations-due-to-plasma-flow-patterns-around-magnetosheath-jets",
          title: 'On the Generation of Pi2 Pulsations due to Plasma Flow Patterns Around Magnetosheath...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2021GL093611";
            },},{id: "publications-classifying-the-magnetosheath-behind-the-quasi-parallel-and-quasi-perpendicular-bow-shock-by-local-measurements",
          title: 'Classifying the Magnetosheath Behind the Quasi‐Parallel and Quasi‐Perpendicular Bow Shock by Local Measurements...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2021JA029269";
            },},{id: "publications-solar-energetic-particle-event-occurrence-prediction-using-solar-flare-soft-x-ray-measurements-and-machine-learning",
          title: 'Solar Energetic Particle Event occurrence prediction using Solar Flare Soft X-ray measurements and...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1051_swsc_2021043";
            },},{id: "publications-downstream-high-speed-plasma-jet-generation-as-a-direct-consequence-of-shock-reformation",
          title: 'Downstream high-speed plasma jet generation as a direct consequence of shock reformation',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1038_s41467-022-28110-4";
            },},{id: "publications-electron-kinetic-entropy-across-quasi-perpendicular-shocks",
          title: 'Electron Kinetic Entropy across Quasi-Perpendicular Shocks',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_3390_e24060745";
            },},{id: "publications-on-magnetosheath-jet-kinetic-structure-and-plasma-properties",
          title: 'On Magnetosheath Jet Kinetic Structure and Plasma Properties',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2022GL100678";
            },},{id: "publications-dynamics-of-earth-39-s-bow-shock-under-near-radial-interplanetary-magnetic-field-conditions",
          title: 'Dynamics of Earth&amp;#39;s bow shock under near-radial interplanetary magnetic field conditions',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1063_5_0089937";
            },},{id: "publications-solar-wind-magnetic-holes-can-cross-the-bow-shock-and-enter-the-magnetosheath",
          title: 'Solar wind magnetic holes can cross the bow shock and enter the magnetosheath...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_5194_angeo-40-687-2022";
            },},{id: "publications-mms-observation-of-two-step-electron-acceleration-at-earth-39-s-bow-shock",
          title: 'MMS Observation of Two‐Step Electron Acceleration at Earth&amp;#39;s Bow Shock',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2023GL104714";
            },},{id: "publications-velocity-of-magnetic-holes-in-the-solar-wind-from-cluster-multipoint-measurements",
          title: 'Velocity of magnetic holes in the solar wind from Cluster multipoint measurements',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_5194_angeo-41-327-2023";
            },},{id: "publications-shocklets-and-short-large-amplitude-magnetic-structures-slams-in-the-high-mach-foreshock-of-venus",
          title: 'Shocklets and Short Large Amplitude Magnetic Structures (SLAMS) in the High Mach Foreshock...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2023GL104610";
            },},{id: "publications-magnetosheath-jets-at-jupiter-and-across-the-solar-system",
          title: 'Magnetosheath jets at Jupiter and across the solar system',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1038_s41467-023-43942-4";
            },},{id: "publications-electron-acceleration-at-earth-39-s-bow-shock-due-to-stochastic-shock-drift-acceleration",
          title: 'Electron Acceleration at Earth&amp;#39;s Bow Shock Due to Stochastic Shock Drift Acceleration',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2023GL106612";
            },},{id: "publications-the-effect-of-fast-solar-wind-on-ion-distribution-downstream-of-earth-s-bow-shock",
          title: 'The Effect of Fast Solar Wind on Ion Distribution Downstream of Earth’s Bow...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_3847_2041-8213_ad2ddf";
            },},{id: "publications-temporal-evolution-of-o-population-in-the-near-earth-plasma-sheet-during-geomagnetic-storms-as-observed-by-the-magnetospheric-multiscale-mission",
          title: 'Temporal Evolution of O+ Population in the Near‐Earth Plasma Sheet During Geomagnetic Storms...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2023JA032203";
            },},{id: "publications-classifying-8-years-of-mms-dayside-plasma-regions-via-unsupervised-machine-learning",
          title: 'Classifying 8 Years of MMS Dayside Plasma Regions via Unsupervised Machine Learning',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2024JA032431";
            },},{id: "publications-transient-upstream-mesoscale-structures-drivers-of-solar-quiet-space-weather",
          title: 'Transient upstream mesoscale structures: drivers of solar-quiet space weather',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_3389_fspas_2024_1436916";
            },},{id: "publications-plasma-sheet-magnetic-flux-transport-during-geomagnetic-storms",
          title: 'Plasma Sheet Magnetic Flux Transport During Geomagnetic Storms',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2024GL110839";
            },},{id: "publications-on-the-formation-of-super-alfvénic-flows-downstream-of-collisionless-shocks",
          title: 'On the Formation of Super-Alfvénic Flows Downstream of Collisionless Shocks',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_3847_1538-4357_ad8570";
            },},{id: "publications-jets-downstream-of-collisionless-shocks-recent-discoveries-and-challenges",
          title: 'Jets Downstream of Collisionless Shocks: Recent Discoveries and Challenges',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1007_s11214-024-01129-3";
            },},{id: "publications-revealing-an-unexpectedly-low-electron-injection-threshold-via-reinforced-shock-acceleration",
          title: 'Revealing an unexpectedly low electron injection threshold via reinforced shock acceleration',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1038_s41467-024-55641-9";
            },},{id: "publications-multimission-observations-of-relativistic-electrons-and-high-speed-jets-linked-to-shock-generated-transients",
          title: 'Multimission Observations of Relativistic Electrons and High-speed Jets Linked to Shock-generated Transients',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_3847_2041-8213_adb154";
            },},{id: "publications-magnetosheath-jet-triggered-ulf-waves-energy-deposition-in-the-ionosphere",
          title: 'Magnetosheath Jet‐Triggered ULF Waves: Energy Deposition in the Ionosphere',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025JA033792";
            },},{id: "publications-sunward-flows-in-the-magnetosheath-associated-with-the-magnetic-pressure-gradient-and-magnetosheath-expansion",
          title: 'Sunward flows in the magnetosheath associated with the magnetic pressure gradient and magnetosheath...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_3389_fspas_2025_1574577";
            },},{id: "publications-ground-magnetic-response-to-an-extraordinary-imf-by-flip-during-the-may-2024-storm-travel-time-from-the-magnetosheath-to-dayside-high-latitudes",
          title: 'Ground Magnetic Response to an Extraordinary IMF BY Flip During the May 2024...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2024JA033691";
            },},{id: "publications-interplay-between-a-foreshock-bubble-and-a-hot-flow-anomaly-forming-along-the-same-rotational-discontinuity",
          title: 'Interplay Between a Foreshock Bubble and a Hot Flow Anomaly Forming Along the...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025GL116473";
            },},{id: "publications-control-of-solar-wind-on-magnetic-field-fluctuations-in-the-subsolar-magnetosheath",
          title: 'Control of Solar Wind on Magnetic Field Fluctuations in the Subsolar Magnetosheath',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025JA033856";
            },},{id: "publications-adaptive-pca-based-outlier-detection-for-multi-feature-time-series-in-space-missions",
          title: 'Adaptive PCA-Based Outlier Detection for Multi-feature Time Series in Space Missions',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1007_978-3-031-97626-1_18";
            },},{id: "publications-automated-classification-of-messenger-plasma-observations-via-unsupervised-transfer-learning",
          title: 'Automated classification of MESSENGER plasma observations via unsupervised transfer learning',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_3389_fspas_2025_1608091";
            },},{id: "publications-role-of-ulf-waves-in-reforming-the-martian-bow-shock",
          title: 'Role of ULF Waves in Reforming the Martian Bow Shock',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025AV001654";
            },},{id: "publications-fermi-acceleration-of-electrons-at-earth-39-s-bow-shock-due-to-current-sheet-interaction",
          title: 'Fermi Acceleration of Electrons at Earth&amp;#39;s Bow Shock Due To Current Sheet Interaction...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025JA034314";
            },},{id: "publications-statistical-relationship-between-foreshock-ulf-wave-power-and-ground-based-pc3-4-wave-power",
          title: 'Statistical Relationship Between Foreshock ULF Wave Power and Ground‐Based Pc3‐4 Wave Power',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025JA033760";
            },},{id: "publications-on-the-spatial-relationship-between-the-aurora-and-relativistic-electron-precipitation-during-a-storm-time-substorm",
          title: 'On the Spatial Relationship Between the Aurora and Relativistic Electron Precipitation During a...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025GL116477";
            },},{id: "publications-automated-bow-shock-identification-and-multi-spacecraft-timing-using-magnetospheric-multiscale-mms-observations",
          title: 'Automated Bow Shock Identification and Multi‐Spacecraft Timing Using Magnetospheric Multiscale (MMS) Observations',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025JA034252";
            },},{id: "publications-a-comparison-of-modeled-and-observed-dayside-bow-shock-locations-in-8-years-of-mms-data",
          title: 'A Comparison of Modeled and Observed Dayside Bow Shock Locations in 8 Years...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025JA033966";
            },},{id: "publications-energy-conversion-and-exchange-in-a-magnetosheath-jet",
          title: 'Energy Conversion and Exchange in a Magnetosheath Jet',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025JA034414";
            },},{id: "publications-stormtime-magnetospheric-processes-associated-with-the-dawnside-current-wedge",
          title: 'Stormtime Magnetospheric Processes Associated with the Dawnside Current Wedge',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025JA034418";
            },},{id: "publications-the-correlation-function-for-magnetic-field-fluctuations-at-ion-dissipation-scales-in-the-solar-wind",
          title: 'The correlation function for magnetic field fluctuations at ion dissipation scales in the...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025JA034569";
            },},{id: "publications-reconstructing-the-geometry-of-a-hot-flow-anomaly-with-bounding-jets-in-magnetosheath",
          title: 'Reconstructing the geometry of a hot flow anomaly with bounding jets in magnetosheath...',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025GL119404";
            },},{id: "publications-statistical-characteristics-of-stormtime-bursty-bulk-flows",
          title: 'Statistical Characteristics of Stormtime Bursty Bulk Flows',
          description: "",
          section: "Publications",handler: () => {
              window.location.href = "/publication/10_1029_2025GL119632";
            },},{id: "talks-processing-solar-images-to-forecast-coronal-mass-ejections-using-artificial-intelligence",
          title: 'Processing Solar Images to forecast Coronal Mass Ejections using Artificial Intelligence',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2018-11-05-posterESWW15";
            },},{id: "talks-forecasting-cmes-using-image-processing-amp-neural-networks",
          title: 'Forecasting CMEs using Image Processing &amp;amp; Neural Networks',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2018-12-19-talk-SpaceCoffee43";
            },},{id: "talks-quasi-parallel-amp-quasi-perpendicular-magnetosheath-jets-using-mms",
          title: 'Quasi-parallel &amp;amp; Quasi-perpendicular Magnetosheath Jets Using MMS',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2019-02-07-talk-SSPM19";
            },},{id: "talks-difference-between-quasi-parallel-amp-quasi-perpendicular-magnetosheath-jets-using-mms",
          title: 'Difference between Quasi-parallel &amp;amp; Quasi-perpendicular Magnetosheath Jets Using MMS',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2019-03-14-poster-SRS19";
            },},{id: "talks-investigation-of-quasi-parallel-amp-quasi-perpendicular-magnetosheath-jets-using-magnetospheric-multiscale-mms",
          title: 'Investigation of Quasi-parallel &amp;amp; Quasi-perpendicular Magnetosheath Jets Using Magnetospheric Multiscale (MMS)',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2019-04-12-talk-EGU19";
            },},{id: "talks-deep-learning-applications-in-space-amp-solar-physics",
          title: 'Deep Learning Applications in Space &amp;amp; Solar Physics',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2019-06-10-Leh_summer_school";
            },},{id: "talks-classifying-magnetosheath-jets-using-mms-quasi-parallel-amp-quasi-perpendicular-jets",
          title: 'Classifying Magnetosheath Jets Using MMS: Quasi parallel &amp;amp; Quasi perpendicular Jets',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2019-08-21-talk-vlasiator_hackathon";
            },},{id: "talks-classification-of-magnetosheath-jets-using-neural-networks-and-high-resolution-omni-hro-data",
          title: 'Classification of Magnetosheath Jets Using Neural Networks and High Resolution OMNI (HRO) data...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2019-09-19-talk-MLhelio19";
            },},{id: "talks-creation-amp-classification-of-magnetosheath-jet-database-using-magnetospheric-multiscale-mms-mission",
          title: 'Creation &amp;amp; Classification of Magnetosheath Jet Database using Magnetospheric Multiscale (MMS) mission',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2019-10-19-posterESWW16_1";
            },},{id: "talks-classification-of-magnetosheath-jets-using-neural-networks-solar-wind-observations-and-high-resolution-imf-measurements",
          title: 'Classification of Magnetosheath Jets using Neural Networks, Solar Wind Observations and High-resolution IMF...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2019-10-20-posterESWW16_2";
            },},{id: "talks-magnetosheath-jets-simulations-data-analysis-amp-machine-learning",
          title: 'Magnetosheath Jets: Simulations, Data Analysis &amp;amp; Machine Learning',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2020-01-29-talk-SpaceCoffee52";
            },},{id: "talks-jets-downstream-of-quasi-parallel-and-quasi-perpendicular-bow-shock",
          title: 'Jets Downstream of Quasi-parallel and Quasi-perpendicular Bow Shock',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2020-10-08-talk-MMSSWT2020";
            },},{id: "talks-investigation-of-different-types-of-magnetosheath-jets-and-their-origin-using-mms",
          title: 'Investigation of Different Types of Magnetosheath Jets and their Origin using MMS',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2020-12-14-talk-AGU20";
            },},{id: "talks-investigation-of-different-types-of-magnetosheath-jets-and-their-origin-using-mms",
          title: 'Investigation of Different Types of Magnetosheath jets and Their Origin using MMS',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2021-01-19-talk-mini-GEM";
            },},{id: "talks-magnetosheath-jets-close-to-the-bow-shock-generation-scenarios-using-mms",
          title: 'Magnetosheath Jets Close to the Bow Shock: Generation Scenarios using MMS',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2021-01-20-talk-mini-GEM";
            },},{id: "talks-magnetosheath-jets-using-mms-classification-and-generation-mechanisms",
          title: 'Magnetosheath jets using MMS: classification and generation mechanisms',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2021-01-31-talk-COSPAR21";
            },},{id: "talks-differentiating-between-convective-and-nested-structures-with-a-single-spacecraft",
          title: 'Differentiating Between Convective and Nested Structures With a Single Spacecraft',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2021-02-01-talk-SSPM21";
            },},{id: "talks-fast-plasma-flows-downstream-of-the-bow-shock-using-mms-correlations-and-generation-mechanisms",
          title: 'Fast Plasma Flows Downstream of the Bow Shock Using MMS: Correlations and Generation...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2021-04-20-talk-EGU21";
            },},{id: "talks-magnetosheath-jets-close-to-the-bow-shock-generation-mechanisms-using-mms",
          title: 'Magnetosheath Jets Close to the Bow Shock: Generation Mechanisms Using MMS',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2021-07-07-talk-Helas21";
            },},{id: "talks-characterization-of-the-earth-s-magnetosheath-and-its-fast-plasma-flows-using-upstream-measurements-and-machine-learning",
          title: 'Characterization of the Earth’s Magnetosheath and its Fast Plasma Flows Using Upstream Measurements...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2021-08-03-talk-AOGS21";
            },},{id: "talks-super-magnetosonic-downstream-jet-formation-as-a-direct-consequence-of-shock-reformation",
          title: 'Super-magnetosonic Downstream Jet Formation as a Direct Consequence of Shock Reformation',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2021-12-14-poster-AGU21";
            },},{id: "talks-magnetosheath-jet-generation-due-to-shock-reformation",
          title: 'Magnetosheath jet generation due to shock reformation',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2022-01-25-talk-MMS-SWT";
            },},{id: "talks-downstream-high-speed-plasma-jet-generation-as-a-direct-consequence-of-shock-reformation",
          title: 'Downstream high-speed plasma jet generation as a direct consequence of shock reformation',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2022-03-16-talk-IRF";
            },},{id: "talks-high-speed-downstream-plasma-jet-generated-due-to-shock-reformation",
          title: 'High-speed Downstream Plasma Jet Generated due to Shock Reformation',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2022-05-10-talk-MMS8community";
            },},{id: "talks-shock-reformation-generating-high-speed-magnetosheath-jets",
          title: 'Shock Reformation Generating High-speed Magnetosheath Jets',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2022-05-27-talk-EGU22";
            },},{id: "talks-high-speed-plasma-jets-generated-by-the-cyclic-behavior-of-the-earth-39-s-bow-shock",
          title: 'High-speed plasma jets generated by the cyclic behavior of the Earth&amp;#39;s bow shock...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2022-06-01-poster-SO22";
            },},{id: "talks-magnetosheath-jets-using-mms",
          title: 'Magnetosheath Jets using MMS',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2022-06-09-talk-SSPM22";
            },},{id: "talks-on-the-discrepancies-of-magnetosheath-jet-identification-and-statistical-properties-due-to-different-temporal-resolution-and-plasma-moment-derivation",
          title: 'On the discrepancies of magnetosheath jet identification and statistical properties due to different...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2022-07-19-talk-COSPAR22";
            },},{id: "talks-high-speed-jets-and-related-phenomena-in-earth-s-bow-shock-and-magnetosheath",
          title: 'High-speed jets and related phenomena in Earth’s bow shock and magnetosheath',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2022-08-19-talk-JHUAPL";
            },},{id: "talks-investigation-of-magnetosheath-jet-kinetic-structure-and-plasma-moment-derivation",
          title: 'Investigation of magnetosheath jet kinetic structure and plasma moment derivation',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2022-12-13-poster-AGU22";
            },},{id: "talks-high-speed-jets-at-earth-s-magnetosheath-amp-more",
          title: 'High-speed jets at Earth’s magnetosheath &amp;amp; more',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2023-01-18-talk-CGSweekly23";
            },},{id: "talks-multi-mission-observations-of-a-high-speed-jet-associated-to-a-solar-wind-discontinuity",
          title: 'Multi-mission observations of a high speed jet associated to a solar wind discontinuity...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2023-04-28-talk-EGU23";
            },},{id: "talks-high-speed-downstream-jets-relevance-to-bow-shock-dynamics-amp-evolution",
          title: 'High-speed downstream jets: relevance to bow shock dynamics &amp;amp; evolution',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2023-07-13-talk-IAGA";
            },},{id: "talks-characterizing-earth-39-s-magnetosheath-and-high-speed-downstream-jets-using-machine-learning",
          title: 'Characterizing Earth&amp;#39;s Magnetosheath and High-Speed Downstream Jets using Machine Learning',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2023-08-22-talk-LMAG23";
            },},{id: "talks-high-speed-jets-and-related-phenomena-at-earth-39-s-bow-shock",
          title: 'High-speed jets and related phenomena at Earth&amp;#39;s bow shock',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2023-09-12-talk-smile-mwg-high-speed-jets";
            },},{id: "talks-discovering-patterns-imbalanced-classification-amp-boundary-surfaces-in-heliophysics-with-artificial-neural-networks",
          title: 'Discovering patterns, imbalanced classification &amp;amp; boundary surfaces in Heliophysics with artificial neural networks...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2023-10-10-talk-DASH23";
            },},{id: "talks-transient-phenomena-in-foreshock-shock-and-magnetosheath-expectations-from-large-separation-campaign",
          title: 'Transient phenomena in foreshock, shock, and magnetosheath – Expectations from large separation campaign...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2023-10-25-talk-DASH";
            },},{id: "talks-magnetic-flux-transport-in-the-plasma-sheet-during-geomagnetic-storms-using-mms",
          title: 'Magnetic flux transport in the plasma sheet during geomagnetic storms using MMS',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-05-12-talk-TESS24";
            },},{id: "talks-evaluating-the-magnetic-and-plasma-flux-transport-in-the-plasma-sheet-during-geomagnetic-storms-using-mms-and-geotail",
          title: 'Evaluating the magnetic and plasma flux transport in the plasma sheet during geomagnetic...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-05-15-talk-EGU24";
            },},{id: "talks-heliophysics-education-and-research-using-cloud-computing",
          title: 'Heliophysics Education and Research using Cloud Computing',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-05-18-talk-EGU24";
            },},{id: "talks-reinforced-shock-acceleration-of-relativistic-electrons",
          title: 'Reinforced Shock Acceleration of Relativistic Electrons',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-06-20-talk-solo-ir-rs-reinforced-shock";
            },},{id: "talks-reinforced-shock-acceleration-of-relativistic-electrons",
          title: 'Reinforced Shock Acceleration of Relativistic Electrons',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-06-27-GEM24_A";
            },},{id: "talks-modeling-earth-s-plasma-sheet-using-machine-learning",
          title: 'Modeling Earth’s Plasma Sheet using Machine Learning',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-06-27-GEM24_B";
            },},{id: "talks-plasma-sheet-magnetic-flux-transport-during-geomagnetic-storms",
          title: 'Plasma Sheet Magnetic Flux Transport During Geomagnetic Storms',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-06-27-GEM24_C";
            },},{id: "talks-relativistic-electrons-energized-by-reinforced-shock-acceleration",
          title: 'Relativistic Electrons Energized by Reinforced Shock Acceleration',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-07-15-COSPAR24";
            },},{id: "talks-stormtime-observations-of-plasma-sheet-convection",
          title: 'Stormtime Observations of Plasma Sheet Convection',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-07-19-COSPAR24";
            },},{id: "talks-collisionless-shocks-and-shock-generated-transients-recent-advancements-and-implications",
          title: 'Collisionless Shocks and Shock Generated Transients: Recent Advancements and Implications',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-09-10-talk-FOM";
            },},{id: "talks-shock-kinetic-processes-and-particle-energization",
          title: 'Shock Kinetic Processes and Particle Energization',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-11-14-PO1st";
            },},{id: "talks-plasma-sheet-convection-during-storms-global-patterns-and-mesoscale-bursty-intervals",
          title: 'Plasma Sheet Convection During Storms: Global Patterns and Mesoscale Bursty Intervals',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-11-18-talk-cgs-plasma-sheet-convection";
            },},{id: "talks-electron-injection-threshold-and-acceleration-processes-at-earth-39-s-foreshock-transients",
          title: 'Electron injection threshold and acceleration processes at Earth&amp;#39;s foreshock transients',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-12-08-talk-agu24-electron-injection-threshold";
            },},{id: "talks-plasma-sheet-convection-during-storms-global-statistical-patterns-and-mesoscale-bursty-flows",
          title: 'Plasma Sheet Convection During Storms: Global Statistical Patterns and Mesoscale Bursty Flows',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-12-08-talk-agu24-plasma-sheet-convection";
            },},{id: "talks-advances-in-understanding-stormtime-magnetotail-dynamics",
          title: 'Advances in Understanding Stormtime Magnetotail Dynamics',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2024-12-13-talk-AGU24";
            },},{id: "talks-advancements-on-ai-for-heliophysics-and-space-weather",
          title: 'Advancements on AI for Heliophysics and Space Weather',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-01-28-talk-ASAP";
            },},{id: "talks-dayside-transients-and-their-effect-on-the-magnetosphere",
          title: 'Dayside Transients and Their Effect on the Magnetosphere',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-02-12-talk-smile-sxi-dayside-transients";
            },},{id: "talks-transient-phenomena-at-collisionless-shocks-and-their-effect-on-particle-acceleration",
          title: 'Transient Phenomena at Collisionless Shocks and Their Effect on Particle Acceleration',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-04-07-talk-esa-heliophysics-seminar";
            },},{id: "talks-understanding-stormtime-geospace-as-a-complex-coupled-system-recent-progress-from-the-center-for-geospace-storms",
          title: 'Understanding stormtime geospace as a complex, coupled system: Recent progress from the Center...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-01-05-talk-EGU25";
            },},{id: "talks-revealing-an-unexpectedly-low-electron-injection-threshold-via-reinforced-shock-acceleration",
          title: 'Revealing an unexpectedly low electron injection threshold via reinforced shock acceleration',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-05-01-talk-egu25-electron-injection-threshold";
            },},{id: "talks-magnetotail-convection-during-storms-global-statistical-patterns-and-mesoscale-bursty-flows",
          title: 'Magnetotail convection during storms: Global Statistical Patterns and Mesoscale Bursty Flows',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-05-06-talk-iwf-seminar-magnetotail";
            },},{id: "talks-multi-mission-observations-of-relativistic-electrons-and-high-speed-jets-linked-to-shock-generated-transients",
          title: 'Multi-mission Observations of Relativistic Electrons and High-speed Jets Linked to Shock-generated Transients',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-05-13-talk-mms-community-relativistic-electrons";
            },},{id: "talks-gem-focus-group-multiscale-dayside-transients-mdt-and-their-effect-on-earth-39-s-magnetosphere",
          title: 'GEM Focus Group: Multiscale Dayside Transients (MDT) and their Effect on Earth&amp;#39;s Magnetosphere...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-06-26-talk-gem25-mdt-focus-group";
            },},{id: "talks-modeling-earth-39-s-plasma-sheet-using-machine-learning",
          title: 'Modeling Earth&amp;#39;s Plasma Sheet using Machine Learning',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-06-26-talk-gem25-plasma-sheet-ml";
            },},{id: "talks-evaluating-plasma-sheet-properties-with-insitu-observations-and-machine-learning-recent-advancements-and-limitations",
          title: 'Evaluating plasma sheet properties with insitu observations and machine learning - Recent advancements...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-06-27-talk-gem25-ml-validation";
            },},{id: "talks-particle-acceleration-and-transient-processes-upstream-of-planetary-bow-shocks",
          title: 'Particle Acceleration and Transient Processes Upstream of Planetary Bow Shocks',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-09-01-talk-iaga25-particle-acceleration";
            },},{id: "talks-storm-time-plasma-sheet-convection-global-patterns-and-the-dynamics-of-mesoscale-bursty-flows",
          title: 'Storm-Time Plasma Sheet Convection: Global Patterns and the Dynamics of Mesoscale Bursty Flows...',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-09-01-talk-iaga25-stormtime-plasma-sheet";
            },},{id: "talks-shock-generated-transients-and-their-effects-on-earth-39-s-magnetospheric-environment",
          title: 'Shock Generated Transients and their Effects on Earth&amp;#39;s Magnetospheric Environment',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-09-12-talk-lws25-shock-transients";
            },},{id: "talks-magnetosheath-jets-and-foreshock-transients-contribution-to-particle-energization-at-collisionless-shocks",
          title: 'Magnetosheath Jets and Foreshock Transients Contribution to Particle Energization at Collisionless Shocks',
          description: "",
          section: "Talks",handler: () => {
              window.location.href = "/talks/2025-10-20-talk-cluster-po-workshop";
            },},{
      id: 'light-theme',
      title: 'Change theme to light',
      description: 'Change the theme of the site to Light',
      section: 'Theme',
      handler: () => {
        setThemeSetting("light");
      },
    },
    {
      id: 'dark-theme',
      title: 'Change theme to dark',
      description: 'Change the theme of the site to Dark',
      section: 'Theme',
      handler: () => {
        setThemeSetting("dark");
      },
    },
    {
      id: 'system-theme',
      title: 'Use system default theme',
      description: 'Change the theme of the site to System Default',
      section: 'Theme',
      handler: () => {
        setThemeSetting("system");
      },
    },];
