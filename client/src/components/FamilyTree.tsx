import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { TreeNode, FamilyMember } from "@/lib/types";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FamilyTreeProps {
  members: FamilyMember[];
  onSelectMember: (member: FamilyMember) => void;
  isLoading: boolean;
}

interface D3TreeNode extends d3.HierarchyNode<TreeNode> {
  x: number;
  y: number;
}

export default function FamilyTree({ members, onSelectMember, isLoading }: FamilyTreeProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || isLoading || members.length === 0) return;

    // Set fixed dimensions for the tree
    const width = 1200; // Fixed width for the SVG
    const height = 800; // Fixed height for the SVG

    // Transform data into hierarchical structure
    const buildTree = (members: FamilyMember[]): TreeNode => {
      const memberMap = new Map(members.map(m => [m.id, { 
        ...m, 
        children: [] as TreeNode[],
        spouse: undefined as TreeNode | undefined,
        parents: [] as TreeNode[]
      }]));

      // First pass: establish all relationships
      members.forEach(member => {
        member.relationships?.forEach(rel => {
          const node = memberMap.get(member.id)!;
          const related = memberMap.get(rel.relatedPersonId);

          if (related) {
            if (rel.relationType === 'child') {
              node.children?.push(related);
            } else if (rel.relationType === 'spouse') {
              node.spouse = related;
            } else if (rel.relationType === 'parent') {
              node.parents?.push(related);
            }
          }
        });
      });

      // Find root node (member without parents or with only spouse relationship)
      const roots = Array.from(memberMap.values()).filter(node => 
        !node.parents?.length && (!node.spouse || node.id < node.spouse.id)
      );
      return roots[0] || memberMap.values().next().value;
    };

    const root = buildTree(members);

    // Clear previous svg
    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3.select(svgRef.current)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width/2},50)`);

    // Increased node sizing for spouse pairs
    const tree = d3.tree<TreeNode>()
      .nodeSize([160, 200])
      .separation((a: d3.HierarchyNode<TreeNode>, b: d3.HierarchyNode<TreeNode>) => {
        return a.parent === b.parent ? 1.5 : 2;
      });

    const hierarchy = d3.hierarchy(root);
    const treeData = tree(hierarchy);

    // Add links
    svg.selectAll("path.link")
      .data(treeData.links())
      .join("path")
      .attr("class", "link")
      .attr("d", d3.linkVertical<d3.HierarchyLink<TreeNode>, d3.HierarchyPointLink<TreeNode>>()
        .x((d: any) => d.x)
        .y((d: any) => d.y))
      .attr("fill", "none")
      .attr("stroke", "hsl(25, 40%, 35%)")
      .attr("stroke-width", 1);

    // Add spouse links
    const spouseLinks = svg.selectAll("path.spouse-link")
      .data(treeData.descendants().filter((d: D3TreeNode) => d.data.spouse))
      .join("path")
      .attr("class", "spouse-link")
      .attr("d", (d: D3TreeNode) => {
        const startX = d.x;
        const endX = d.x + 80;
        const y = d.y;
        return `M${startX},${y} L${endX},${y}`;
      })
      .attr("stroke", "hsl(25, 40%, 35%)")
      .attr("stroke-width", 1)
      .attr("stroke-dasharray", "4,4");

    // Add nodes
    const nodes = svg.selectAll("g.node")
      .data(treeData.descendants())
      .join("g")
      .attr("class", "node")
      .attr("transform", (d: D3TreeNode) => `translate(${d.x},${d.y})`);

    // Add spouse nodes
    const spouseNodes = svg.selectAll("g.spouse-node")
      .data(treeData.descendants().filter((d: D3TreeNode) => d.data.spouse))
      .join("g")
      .attr("class", "spouse-node")
      .attr("transform", (d: D3TreeNode) => `translate(${d.x + 80},${d.y})`);

    // Style nodes
    nodes.append("circle")
      .attr("r", 5)
      .attr("fill", "hsl(25, 40%, 35%)");

    nodes.append("text")
      .attr("dy", "1.5em")
      .attr("x", -40)
      .attr("text-anchor", "middle")
      .text((d: D3TreeNode) => `${d.data.firstName} ${d.data.lastName}`)
      .attr("class", "text-sm font-serif");

    // Style spouse nodes
    spouseNodes.append("circle")
      .attr("r", 5)
      .attr("fill", "hsl(25, 40%, 35%)");

    spouseNodes.append("text")
      .attr("dy", "1.5em")
      .attr("x", 40)
      .attr("text-anchor", "middle")
      .text((d: D3TreeNode) => `${d.data.spouse?.firstName} ${d.data.spouse?.lastName}`)
      .attr("class", "text-sm font-serif");

    // Add click handlers
    nodes.on("click", (_: PointerEvent, d: D3TreeNode) => {
      onSelectMember(d.data);
    });

    spouseNodes.on("click", (_: PointerEvent, d: D3TreeNode) => {
      if (d.data.spouse) {
        onSelectMember(d.data.spouse);
      }
    });

  }, [members, isLoading, onSelectMember]);

  if (isLoading) {
    return <Skeleton className="w-full h-full" />;
  }

  return (
    <Card className="w-full h-[600px]">
      <ScrollArea className="h-full w-full rounded-md">
        <div className="relative w-full h-full min-w-[1200px] min-h-[800px]">
          <svg
            ref={svgRef}
            className="absolute inset-0"
          />
        </div>
      </ScrollArea>
    </Card>
  );
}