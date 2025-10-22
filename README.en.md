# Batch Component Placement

A batch placement tool for EasyEDA Professional Edition that supports importing component information via CSV files and automatically placing components at specified coordinate locations.

## Supported Features

- **PCB Footprint Placement**: Batch place components on the PCB based on package name

- **Schematic Symbol Placement**: Batch place components on the schematic based on symbol name

## Features

- Supports batch importing component information from CSV files
- Accurately place components at specified locations based on coordinate information
- Intelligent Unit Conversion: Supports automatic conversion between mm, mils, and inches
- Intelligent Header Recognition: Automatically extracts unit information from the CSV header (e.g., Name, X(mm), Y(mm))
- Footprint/symbol name and device name must match exactly for placement
- Provides detailed success/failure statistics and error messages
- Supports selecting different component libraries (system library, personal library, project library, etc.)

## Usage

### 1. Prepare a CSV file

Create a CSV file in the format: `Component Name, X Coordinate, Y Coordinate`

#### PCB Package Placement Example

**Sample File Content (Sample Package Data.csv):**
```csv
name,x,y
RELAY-TH_HVR24-2A04-02,0,0
CONN-TH_250-121,3000,0
RELAY-TH_HVR24-2A04-02,6000,0
SSOP-4_L2.7-W4.4-P1.27-LS7.0-BL,6000,1000
HDR-TH_SSW-101-03-G-S,9000,1000
```

* *Smart unit conversion example (using mm):**
```csv
Name, X(mm), Y(mm)
RELAY-TH_HVR24-2A04-02, 0, 0
CONN-TH_250-121, 76.2, 0
RELAY-TH_HVR24-2A04-02, 152.4, 0
SSOP-4_L2.7-W4.4-P1.27-LS7.0-BL, 152.4, 25.4
HDR-TH_SSW-101-03-G-S, 228.6, 25.4
```

#### Schematic Symbol Placement Example

**Example File Content (Sample Symbol Data .csv):**
```csv
name,x,y
HHW32GS62C-B1,30,10
STM32F103C8T6,60,10
LM358,90,10
```

**Smart Unit Conversion Example (using mm):**
```csv
Name,X(mm),Y(mm)
HHW32GS62C-B1,762,254
STM32F103C8T6,1524,254
LM358,2286,254
```

**Format Description:**
- First Column: Component Name (Package Mode matches Package Name, Symbol Mode matches Symbol Name)
- Second Column: X Coordinate
- Third Column: Y Coordinate
- Supports CSV files with headers (as shown in the example)
- **Smart Unit Conversion**:
- You can specify units in the table header: `Name, X (mm), Y (mm)` or `Name, X (mil), Y (mil)` or `Name, X (inch), Y (inch)`.
- If units are not specified in the table header, the default units are: mil for PCB footprints and inches for schematic symbols.
- The system automatically converts to internal standard units (mil for PCB, inches for schematic).

### 2. Setting Up the Component Library

1. In the editor, click **Place Component** → **Settings**
2. Select the component library type to use:
- **System Library**: Use the system default component library
- **Personal Library**: Use a personally created component library
- **Project Library**: Use the project library for the current project
- **Other Library**: Select another team's library

### 3. Batch Place Components

#### PCB Footprint Placement
1. In the **PCB page**, click **Place Component** → **Batch Place**
2. Select the prepared footprint CSV file
3. The extension will automatically parse the CSV file and begin placing footprints.

[PCB Footprint Placement Demo](images/Footprint Placement.gif)

#### Schematic Symbol Placement
1. On the **Schematic Page**, click **Place Components** → **Batch Place**
2. Select the prepared symbol CSV file.
3. The extension will automatically parse the CSV file and begin placing symbols.

[Schematic Symbol Placement Demo](images/Symbol Placement.gif)

**After completion, a statistical result will be displayed. Detailed error information can be viewed in the Log panel.**

## Troubleshooting

If placement fails, please check the following:

- ✅ Is the component name exactly the same as in the library (case-sensitive)?
- ✅ Are you using the correct editor (PCB/Schematic)?
- ✅ Is the CSV file format correct?
- ✅ Are the coordinate values valid numbers?
- ✅ Is the unit format in the header correct (e.g., X (mm), Y (mil)?
- ✅ Is the correct component library selected?
- ✅ Check the Log panel for detailed error information.
