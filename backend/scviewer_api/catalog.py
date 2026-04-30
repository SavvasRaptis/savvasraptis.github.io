from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Spacecraft:
    id: str
    name: str
    horizons_id: str
    horizons_aliases: tuple[str, ...]
    group: str
    symbol: str


SPACECRAFT_CATALOG: list[Spacecraft] = [
    Spacecraft("MMS1", "MMS-1", "-140482", (), "magnetospheric", "circle"),
    Spacecraft("MMS2", "MMS-2", "-140483", (), "magnetospheric", "square"),
    Spacecraft("MMS3", "MMS-3", "-140484", (), "magnetospheric", "triangle"),
    Spacecraft("MMS4", "MMS-4", "-140485", (), "magnetospheric", "diamond"),
    Spacecraft("THA", "THEMIS-A", "THEMIS-A", (), "magnetospheric", "star"),
    Spacecraft("THD", "THEMIS-D", "THEMIS-D", (), "magnetospheric", "cross"),
    Spacecraft("THE", "THEMIS-E", "THEMIS-E", (), "magnetospheric", "triangleDown"),
    Spacecraft("ARTP1", "ARTEMIS-P1", "-192", (), "magnetospheric", "pentagon"),
    Spacecraft("ARTP2", "ARTEMIS-P2", "-193", (), "magnetospheric", "circle"),
    Spacecraft("CL1", "Cluster-1", "CLUSTER-1", (), "magnetospheric", "square"),
    Spacecraft("CL2", "Cluster-2", "CLUSTER-2", (), "magnetospheric", "triangle"),
    Spacecraft("CL3", "Cluster-3", "CLUSTER-3", (), "magnetospheric", "diamond"),
    Spacecraft("CL4", "Cluster-4", "CLUSTER-4", (), "magnetospheric", "star"),
    Spacecraft("GEOTAIL", "Geotail", "GEOTAIL", (), "magnetospheric", "cross"),
    Spacecraft("WIND", "WIND", "-8", (), "solar_l1", "circle"),
    Spacecraft("ACE", "ACE", "-92", (), "solar_l1", "square"),
    Spacecraft("SOHO", "SOHO", "-21", (), "solar_l1", "triangle"),
    Spacecraft("DSCOVR", "DSCOVR", "-78", (), "solar_l1", "diamond"),
    Spacecraft("ADITYA", "Aditya-L1", "-161", (), "solar_l1", "star"),
    Spacecraft("IMAP", "IMAP", "-43", (), "solar_l1", "cross"),
    Spacecraft("SOLAR1", "SOLAR-1", "-231", (), "solar_l1", "triangleDown"),
    Spacecraft("PSP", "Parker Solar Probe", "-96", (), "inner_heli", "circle"),
    Spacecraft("SOLO", "Solar Orbiter", "-144", (), "inner_heli", "square"),
    Spacecraft("STEREOA", "STEREO-A", "-234", (), "inner_heli", "triangle"),
    Spacecraft("JUICE", "JUICE", "-28", (), "deep_space", "circle"),
    Spacecraft("EURC", "Europa Clipper", "-159", (), "deep_space", "square"),
    Spacecraft("JUNO", "Juno", "-61", (), "deep_space", "triangle"),
    Spacecraft("BEPI", "BepiColombo", "-121", (), "deep_space", "diamond"),
    Spacecraft("MAVEN", "MAVEN", "-202", (), "deep_space", "star"),
    Spacecraft("VOYAGER1", "Voyager-1", "-31", (), "deep_space", "cross"),
    Spacecraft("VOYAGER2", "Voyager-2", "-32", (), "deep_space", "triangleDown"),
]

SPACECRAFT_BY_ID: dict[str, Spacecraft] = {sc.id: sc for sc in SPACECRAFT_CATALOG}
